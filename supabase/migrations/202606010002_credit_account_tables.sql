create table if not exists credit_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete restrict,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  installment_count integer not null default 8 check (installment_count > 0),
  installment_amount numeric(12, 2) not null check (installment_amount >= 0),
  sale_date timestamptz not null default now(),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists credit_payments (
  id uuid primary key default gen_random_uuid(),
  credit_account_id uuid not null references credit_accounts(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  payment_date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_accounts_customer_id on credit_accounts(customer_id);
create index if not exists idx_credit_accounts_sale_date on credit_accounts(sale_date desc);
create index if not exists idx_credit_accounts_is_active on credit_accounts(is_active);

create index if not exists idx_credit_payments_credit_account_id on credit_payments(credit_account_id);
create index if not exists idx_credit_payments_payment_date on credit_payments(payment_date desc);

alter table credit_accounts enable row level security;
alter table credit_payments enable row level security;

-- Admin-only access via Next.js API with service role key.
-- No public insert/update/delete policies.
create policy "Admin can read credit accounts"
  on credit_accounts for select
  using (exists (
    select 1 from profiles
    where user_id = auth.uid()
      and role in ('ADMIN', 'STAFF')
      and is_active = true
  ));

create policy "Admin can read credit payments"
  on credit_payments for select
  using (exists (
    select 1 from profiles
    where user_id = auth.uid()
      and role in ('ADMIN', 'STAFF')
      and is_active = true
  ));

create or replace function get_credit_dashboard()
returns table(
  total_financed numeric,
  total_collected numeric,
  total_pending numeric,
  customer_count bigint,
  customers_with_debt bigint
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(sum(ca.installment_amount * ca.installment_count), 0)::numeric as total_financed,
    coalesce(sum(cp.amount), 0)::numeric as total_collected,
    coalesce(sum(ca.installment_amount * ca.installment_count), 0)::numeric
      - coalesce(sum(cp.amount), 0)::numeric as total_pending,
    count(distinct ca.customer_id)::bigint as customer_count,
    count(distinct case
      when coalesce(ca_paid.paid, 0) < (ca.installment_amount * ca.installment_count)
      then ca.customer_id
    end)::bigint as customers_with_debt
  from credit_accounts ca
  left join lateral (
    select coalesce(sum(cp2.amount), 0) as paid
    from credit_payments cp2
    where cp2.credit_account_id = ca.id
  ) ca_paid on true
  left join credit_payments cp on cp.credit_account_id = ca.id
  where ca.is_active = true;
$$;

-- Revoke direct public execution; intended for Next.js service-role only.
revoke execute on function get_credit_dashboard() from anon, authenticated;
