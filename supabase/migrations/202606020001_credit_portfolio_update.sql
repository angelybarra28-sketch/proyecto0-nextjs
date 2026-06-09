-- Migration: Extend credit portfolio for historical import and daily operation
-- Adds operation_number, payment_method, and import RPC

-- 1. Add operation_number to credit_accounts
alter table credit_accounts add column if not exists operation_number text;
create index if not exists idx_credit_accounts_operation_number on credit_accounts(operation_number);

-- 2. Add payment_method to credit_payments
alter table credit_payments add column if not exists payment_method text default 'EFECTIVO'
  check (payment_method in ('EFECTIVO','MERCADO_PAGO','TRANSFERENCIA','OTRO'));
create index if not exists idx_credit_payments_payment_method on credit_payments(payment_method);

-- 3. Update get_credit_dashboard to include more metrics
-- (active/finished accounts, monthly collection evolution)
create or replace function get_credit_dashboard()
returns table(
  total_financed numeric,
  total_collected numeric,
  total_pending numeric,
  customer_count bigint,
  customers_with_debt bigint,
  active_accounts bigint,
  finished_accounts bigint,
  current_month_collected numeric,
  previous_month_collected numeric,
  monthly_collection jsonb
)
language sql
security definer
set search_path = public
as $$
with account_totals as (
  select
    ca.id as ca_id,
    ca.customer_id,
    ca.operation_number,
    ca.installment_amount * ca.installment_count as financed,
    coalesce(sum(ci.original_amount - ci.remaining_amount), 0) as collected,
    coalesce(sum(ci.remaining_amount), 0) as pending
  from credit_accounts ca
  left join credit_installments ci on ci.credit_account_id = ca.id
  where ca.is_active = true
  group by ca.id, ca.customer_id, ca.operation_number, ca.installment_amount, ca.installment_count
),
bounds as (
  select
    date_trunc('month', now()) as month_start,
    date_trunc('month', now()) - interval '1 month' as previous_month_start
),
current_month as (
  select coalesce(sum(cp.amount), 0)::numeric as collected
  from credit_payments cp, bounds
  where cp.payment_date >= bounds.month_start
),
previous_month as (
  select coalesce(sum(cp.amount), 0)::numeric as collected
  from credit_payments cp, bounds
  where cp.payment_date >= bounds.previous_month_start
    and cp.payment_date < bounds.month_start
),
monthly as (
  select coalesce(jsonb_agg(metric order by metric->>'month'), '[]'::jsonb) as metrics
  from (
    select jsonb_build_object(
      'month', to_char(months.month, 'YYYY-MM'),
      'collected', coalesce(c.collected, 0)
    ) as metric
    from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') months(month)
    left join (
      select date_trunc('month', payment_date) as month, sum(amount)::numeric as collected
      from credit_payments
      group by 1
    ) c on c.month = months.month
  ) rows
)
select
  agg.total_financed,
  agg.total_collected,
  agg.total_pending,
  agg.customer_count,
  agg.customers_with_debt,
  agg.active_accounts,
  agg.finished_accounts,
  current_month.collected,
  previous_month.collected,
  monthly.metrics
from (
  select
    coalesce(sum(account_totals.financed), 0)::numeric as total_financed,
    coalesce(sum(account_totals.collected), 0)::numeric as total_collected,
    coalesce(sum(account_totals.pending), 0)::numeric as total_pending,
    count(distinct account_totals.customer_id)::bigint as customer_count,
    count(distinct case when account_totals.pending > 0 then account_totals.customer_id end)::bigint as customers_with_debt,
    count(*) filter (where account_totals.pending > 0)::bigint as active_accounts,
    count(*) filter (where account_totals.pending = 0)::bigint as finished_accounts
  from account_totals
) agg,
current_month,
previous_month,
monthly;
$$;

-- 4. Update get_credit_collection_route to include operation_number
create or replace function get_credit_collection_route()
returns table(
  credit_account_id uuid,
  customer_id uuid,
  customer_full_name text,
  customer_phone text,
  customer_address text,
  product_name text,
  operation_number text,
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
      ca.operation_number,
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
    group by ca.id, ca.customer_id, ca.product_name, ca.operation_number
    having count(ci.id) filter (where ci.status = 'OVERDUE') > 0
  )
  select
    s.ca_id,
    s.cust_id,
    c.full_name,
    c.phone,
    c.address,
    s.product_name,
    s.operation_number,
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

-- 5. Create import RPC for portfolio historical data
create or replace function import_credit_portfolio_row(p_data jsonb)
returns table (
  credit_account_id uuid,
  customer_id uuid,
  payments_imported integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_credit_account_id uuid;
  v_payment jsonb;
  v_payment_id uuid;
  v_remaining_to_allocate numeric(12, 2);
  v_allocation_amount numeric(12, 2);
  v_installment record;
  v_payments_count integer := 0;
  v_phone text;
  v_full_name text;
begin
  -- normalize customer inputs
  v_phone := nullif(trim(p_data->'customer'->>'phone'), '');
  v_full_name := nullif(trim(p_data->'customer'->>'full_name'), '');

  -- find by phone
  if v_phone is not null then
    select id into v_customer_id from customers where phone = v_phone limit 1;
  end if;

  -- find by full_name if no phone match
  if v_customer_id is null and v_full_name is not null then
    select id into v_customer_id from customers where full_name = v_full_name limit 1;
  end if;

  -- create customer if not found
  if v_customer_id is null then
    insert into customers (
      full_name,
      phone,
      address,
      city,
      notes
    ) values (
      coalesce(v_full_name, 'Cliente sin nombre'),
      v_phone,
      nullif(trim(p_data->'customer'->>'address'), ''),
      nullif(trim(p_data->'customer'->>'between_streets'), ''),
      nullif(trim(p_data->'customer'->>'between_streets'), '')
    )
    returning id into v_customer_id;
  end if;

  -- insert credit account
  insert into credit_accounts (
    customer_id,
    operation_number,
    product_name,
    quantity,
    installment_count,
    installment_amount,
    sale_date,
    notes
  ) values (
    v_customer_id,
    nullif(trim(p_data->>'operation_number'), ''),
    coalesce(nullif(trim(p_data->>'product_name'), ''), 'Artículo no especificado'),
    1,
    (p_data->>'installment_count')::integer,
    (p_data->>'installment_amount')::numeric,
    coalesce((p_data->>'sale_date')::date, current_date),
    nullif(trim(p_data->>'notes'), '')
  )
  returning id into v_credit_account_id;

  -- generate installments
  perform generate_credit_installments(
    v_credit_account_id,
    (p_data->>'installment_count')::integer,
    (p_data->>'installment_amount')::numeric,
    coalesce((p_data->>'sale_date')::date, current_date)
  );

  -- process historical payments
  for v_payment in select value from jsonb_array_elements(p_data->'payments') loop
    insert into credit_payments (
      credit_account_id,
      amount,
      payment_date,
      payment_method,
      notes
    ) values (
      v_credit_account_id,
      (v_payment->>'amount')::numeric,
      (v_payment->>'payment_date')::date,
      coalesce(nullif(trim(v_payment->>'payment_method'), ''), 'EFECTIVO'),
      nullif(trim(v_payment->>'notes'), '')
    )
    returning id into v_payment_id;

    v_remaining_to_allocate := (v_payment->>'amount')::numeric;

    for v_installment in
      select * from credit_installments
      where credit_account_id = v_credit_account_id
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
        v_payment_id,
        v_installment.id,
        v_allocation_amount
      );

      update credit_installments
      set
        paid_amount = paid_amount + v_allocation_amount,
        remaining_amount = remaining_amount - v_allocation_amount,
        status = case when remaining_amount - v_allocation_amount = 0 then 'PAID' else 'PARTIAL' end,
        updated_at = now()
      where id = v_installment.id;

      v_remaining_to_allocate := v_remaining_to_allocate - v_allocation_amount;
    end loop;

    v_payments_count := v_payments_count + 1;
  end loop;

  return query select v_credit_account_id, v_customer_id, v_payments_count;
end;
$$;

-- 6. Revoke public execution on new/updated RPCs
revoke execute on function get_credit_dashboard() from anon, authenticated;
revoke execute on function get_credit_collection_route() from anon, authenticated;
revoke execute on function import_credit_portfolio_row(jsonb) from anon, authenticated;
