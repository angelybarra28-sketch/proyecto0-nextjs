create table if not exists credit_installments (
  id uuid primary key default gen_random_uuid(),
  credit_account_id uuid not null references credit_accounts(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  due_date date not null,
  original_amount numeric(12, 2) not null check (original_amount >= 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  remaining_amount numeric(12, 2) not null check (remaining_amount >= 0),
  status text not null default 'PENDING' check (status in ('PENDING','PARTIAL','PAID','OVERDUE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (credit_account_id, installment_number),
  check (paid_amount + remaining_amount = original_amount)
);

create table if not exists credit_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  credit_payment_id uuid not null references credit_payments(id) on delete cascade,
  credit_installment_id uuid not null references credit_installments(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (credit_payment_id, credit_installment_id)
);

create table if not exists credit_collection_notes (
  id uuid primary key default gen_random_uuid(),
  credit_account_id uuid not null references credit_accounts(id) on delete cascade,
  contact_type text not null check (contact_type in ('CALL','WHATSAPP','VISIT','OTHER')),
  result text not null default 'NOTE' check (result in ('NOTE','PROMISE','NO_CONTACT','PARTIAL_PAYMENT','PAID','OTHER')),
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_credit_installments_account_id on credit_installments(credit_account_id);
create index if not exists idx_credit_installments_due_date on credit_installments(due_date);
create index if not exists idx_credit_installments_status on credit_installments(status);
create index if not exists idx_credit_installments_status_due_date on credit_installments(status, due_date);

create index if not exists idx_credit_payment_allocations_payment_id on credit_payment_allocations(credit_payment_id);
create index if not exists idx_credit_payment_allocations_installment_id on credit_payment_allocations(credit_installment_id);

create index if not exists idx_credit_collection_notes_account_id on credit_collection_notes(credit_account_id);
create index if not exists idx_credit_collection_notes_created_at on credit_collection_notes(created_at desc);

-- RLS
alter table credit_installments enable row level security;
alter table credit_payment_allocations enable row level security;
alter table credit_collection_notes enable row level security;

create policy "Admin can read credit installments"
  on credit_installments for select
  using (exists (
    select 1 from profiles
    where user_id = auth.uid()
      and role in ('ADMIN', 'STAFF')
      and is_active = true
  ));

create policy "Admin can read credit payment allocations"
  on credit_payment_allocations for select
  using (exists (
    select 1 from profiles
    where user_id = auth.uid()
      and role in ('ADMIN', 'STAFF')
      and is_active = true
  ));

create policy "Admin can read credit collection notes"
  on credit_collection_notes for select
  using (exists (
    select 1 from profiles
    where user_id = auth.uid()
      and role in ('ADMIN', 'STAFF')
      and is_active = true
  ));

-- Function: generate installments when a credit account is created
-- This function creates the schedule of installments for a credit account.
create or replace function generate_credit_installments(
  p_credit_account_id uuid,
  p_installment_count integer,
  p_installment_amount numeric,
  p_start_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment_number integer;
  v_installment_amount numeric(12, 2);
  v_total numeric(12, 2);
begin
  v_total := p_installment_count * p_installment_amount;

  for v_installment_number in 1..p_installment_count loop
    if v_installment_number < p_installment_count then
      v_installment_amount := trunc((v_total / p_installment_count) * 100) / 100;
    else
      v_installment_amount := v_total - ((trunc((v_total / p_installment_count) * 100) / 100) * (p_installment_count - 1));
    end if;

    insert into credit_installments (
      credit_account_id,
      installment_number,
      due_date,
      original_amount,
      paid_amount,
      remaining_amount,
      status
    ) values (
      p_credit_account_id,
      v_installment_number,
      (p_start_date + ((v_installment_number - 1) * interval '1 month'))::date,
      v_installment_amount,
      0,
      v_installment_amount,
      'PENDING'
    );
  end loop;
end;
$$;

-- Function: apply a payment to installments (FIFO)
create or replace function apply_credit_payment(
  p_credit_payment_id uuid,
  p_credit_account_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment record;
  v_remaining_to_allocate numeric(12, 2);
  v_allocation_amount numeric(12, 2);
begin
  v_remaining_to_allocate := p_amount;

  for v_installment in
    select *
    from credit_installments
    where credit_account_id = p_credit_account_id
      and remaining_amount > 0
    order by installment_number asc
    for update
  loop
    exit when v_remaining_to_allocate <= 0;

    v_allocation_amount := least(v_remaining_to_allocate, v_installment.remaining_amount);

    insert into credit_payment_allocations (
      credit_payment_id,
      credit_installment_id,
      amount
    ) values (
      p_credit_payment_id,
      v_installment.id,
      v_allocation_amount
    );

    update credit_installments
    set
      paid_amount = paid_amount + v_allocation_amount,
      remaining_amount = remaining_amount - v_allocation_amount,
      status = case
        when remaining_amount - v_allocation_amount = 0 then 'PAID'
        else 'PARTIAL'
      end,
      updated_at = now()
    where id = v_installment.id;

    v_remaining_to_allocate := v_remaining_to_allocate - v_allocation_amount;
  end loop;
end;
$$;

-- Function: refresh overdue installments
create or replace function refresh_credit_overdue()
returns table(overdue_updated integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update credit_installments
  set status = 'OVERDUE',
      updated_at = now()
  where status in ('PENDING', 'PARTIAL')
    and due_date < current_date;

  get diagnostics v_count = row_count;

  return query select v_count;
end;
$$;

-- Function: get overdue accounts for collection route
create or replace function get_credit_collection_route()
returns table(
  credit_account_id uuid,
  customer_id uuid,
  customer_full_name text,
  customer_phone text,
  customer_address text,
  product_name text,
  total_debt numeric,
  overdue_amount numeric,
  days_overdue integer,
  first_overdue_date date,
  installment_count integer,
  paid_installments integer,
  overdue_installments integer
)
language sql
security definer
set search_path = public
as $$
  with account_summary as (
    select
      ca.id as ca_id,
      ca.customer_id as cust_id,
      ca.product_name,
      count(ci.id)::integer as total_installments,
      count(ci.id) filter (where ci.status = 'PAID')::integer as paid_count,
      count(ci.id) filter (where ci.status = 'OVERDUE')::integer as overdue_count,
      sum(ci.original_amount) as total_debt,
      sum(ci.remaining_amount) filter (where ci.status = 'OVERDUE') as overdue_amount,
      min(ci.due_date) filter (where ci.status = 'OVERDUE') as first_overdue,
      max(current_date - ci.due_date) filter (where ci.status = 'OVERDUE') as max_days
    from credit_accounts ca
    join credit_installments ci on ci.credit_account_id = ca.id
    where ca.is_active = true
    group by ca.id, ca.customer_id, ca.product_name
    having count(ci.id) filter (where ci.status = 'OVERDUE') > 0
  )
  select
    s.ca_id,
    s.cust_id,
    c.full_name,
    c.phone,
    c.address,
    s.product_name,
    coalesce(s.total_debt, 0)::numeric,
    coalesce(s.overdue_amount, 0)::numeric,
    coalesce(s.max_days, 0)::integer,
    s.first_overdue,
    s.total_installments,
    s.paid_count,
    s.overdue_count
  from account_summary s
  left join customers c on c.id = s.cust_id
  order by s.max_days desc, s.first_overdue asc;
$$;

revoke execute on function generate_credit_installments(uuid, integer, numeric, date) from anon, authenticated;
revoke execute on function apply_credit_payment(uuid, uuid, numeric) from anon, authenticated;
revoke execute on function refresh_credit_overdue() from anon, authenticated;
revoke execute on function get_credit_collection_route() from anon, authenticated;
