-- Phase 1 Supabase schema: catalog + checkout sales persistence.
-- Apply this manually in Supabase SQL editor or through your preferred migration flow.

create extension if not exists pgcrypto;

create type product_status as enum (
  'ACTIVE',
  'INACTIVE',
  'OUT_OF_STOCK',
  'ARCHIVED'
);

create type sale_status as enum (
  'PENDING',
  'CONFIRMED',
  'DELIVERED',
  'CANCELLED'
);

create type collection_status as enum (
  'PENDING',
  'UP_TO_DATE',
  'OVERDUE',
  'PAID'
);

do $$
begin
  alter type collection_status add value if not exists 'UP_TO_DATE';
  alter type collection_status add value if not exists 'OVERDUE';
exception
  when duplicate_object then null;
end $$;

create type payment_plan_type as enum (
  'FULL_PAYMENT',
  'INSTALLMENTS'
);

create type installment_status as enum (
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE'
);

create type payment_method as enum (
  'CASH',
  'BANK_TRANSFER',
  'MERCADO_PAGO',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'OTHER'
);

create type payment_status as enum (
  'PENDING',
  'CONFIRMED',
  'VOIDED'
);

create type allocation_status as enum (
  'ACTIVE',
  'VOIDED'
);

create type app_role as enum (
  'ADMIN',
  'STAFF',
  'CUSTOMER'
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  parent_id uuid references categories(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  legacy_product_id integer unique,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  discount_label text,
  stock integer not null default 0 check (stock >= 0),
  status product_status not null default 'ACTIVE',
  featured boolean not null default false,
  image_url text,
  carousel_images jsonb not null default '[]'::jsonb,
  specifications jsonb not null default '{}'::jsonb,
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  dni text unique,
  phone text,
  email text unique,
  address text,
  city text,
  province text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'CUSTOMER',
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique default ('SALE-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  checkout_request_id text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  sale_status sale_status not null default 'PENDING',
  subtotal_amount numeric(12, 2) not null default 0 check (subtotal_amount >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  remaining_amount numeric(12, 2) not null default 0 check (remaining_amount >= 0),
  collection_status collection_status not null default 'PENDING',
  item_count integer not null default 0 check (item_count >= 0),
  payment_plan_type payment_plan_type not null default 'FULL_PAYMENT',
  installments_count integer not null default 1 check (installments_count >= 1),
  payment_method_requested text,
  source text not null default 'checkout_whatsapp',
  delivery_full_name text,
  delivery_phone text,
  delivery_address text,
  delivery_city text,
  delivery_notes text,
  notes text,
  sale_date timestamptz not null default now(),
  confirmed_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  legacy_product_id integer,
  product_name_snapshot text not null,
  product_slug_snapshot text,
  category_name_snapshot text,
  unit_price_snapshot numeric(12, 2) not null check (unit_price_snapshot >= 0),
  quantity integer not null check (quantity > 0),
  line_subtotal numeric(12, 2) not null check (line_subtotal >= 0),
  line_discount_amount numeric(12, 2) not null default 0 check (line_discount_amount >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  image_url_snapshot text,
  created_at timestamptz not null default now()
);

create table if not exists installments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  due_date date not null,
  original_amount numeric(12, 2) not null check (original_amount >= 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  remaining_amount numeric(12, 2) not null check (remaining_amount >= 0),
  status installment_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sale_id, installment_number),
  check (paid_amount + remaining_amount = original_amount)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method payment_method not null,
  status payment_status not null default 'CONFIRMED',
  payment_date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete restrict,
  installment_id uuid not null references installments(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  status allocation_status not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

alter table sales add column if not exists collection_status collection_status not null default 'PENDING';
alter table sales add column if not exists payment_plan_type payment_plan_type not null default 'FULL_PAYMENT';
alter table sales add column if not exists installments_count integer not null default 1 check (installments_count >= 1);

create index if not exists idx_categories_slug on categories(slug);
create index if not exists idx_categories_active on categories(is_active);
create index if not exists idx_categories_parent_id on categories(parent_id);

create index if not exists idx_products_legacy_product_id on products(legacy_product_id);
create index if not exists idx_products_slug on products(slug);
create index if not exists idx_products_category_id on products(category_id);
create index if not exists idx_products_status on products(status);
create index if not exists idx_products_featured on products(featured);
create index if not exists idx_products_price on products(price);

create index if not exists idx_customers_dni on customers(dni);
create index if not exists idx_customers_phone on customers(phone);
create index if not exists idx_customers_email on customers(email);
create index if not exists idx_customers_full_name on customers(full_name);
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_is_active on profiles(is_active);
create unique index if not exists idx_customers_phone_unique
  on customers(phone)
  where phone is not null and phone <> '';
create unique index if not exists idx_customers_email_lower_unique
  on customers(lower(email))
  where email is not null and email <> '';

create index if not exists idx_sales_customer_id on sales(customer_id);
create index if not exists idx_sales_sale_number on sales(sale_number);
create index if not exists idx_sales_checkout_request_id on sales(checkout_request_id);
create index if not exists idx_sales_sale_status on sales(sale_status);
create index if not exists idx_sales_sale_date on sales(sale_date);
create index if not exists idx_sales_customer_date on sales(customer_id, sale_date);
create index if not exists idx_sales_item_count on sales(item_count);
create index if not exists idx_sales_payment_plan_type on sales(payment_plan_type);
create index if not exists idx_sales_collection_status on sales(collection_status);

create index if not exists idx_sale_items_sale_id on sale_items(sale_id);
create index if not exists idx_sale_items_product_id on sale_items(product_id);
create index if not exists idx_sale_items_legacy_product_id on sale_items(legacy_product_id);
create index if not exists idx_sale_items_product_created on sale_items(product_id, created_at);
create index if not exists idx_sale_items_category_created on sale_items(category_name_snapshot, created_at);
create unique index if not exists idx_sale_items_sale_legacy_unique
  on sale_items(sale_id, legacy_product_id)
  where legacy_product_id is not null;

create index if not exists idx_installments_sale_id on installments(sale_id);
create index if not exists idx_installments_due_date on installments(due_date);
create index if not exists idx_installments_status on installments(status);
create index if not exists idx_installments_status_due_date on installments(status, due_date);

create index if not exists idx_payments_sale_id on payments(sale_id);
create index if not exists idx_payments_customer_id on payments(customer_id);
create index if not exists idx_payments_payment_date on payments(payment_date);
create index if not exists idx_payments_status on payments(status);
create index if not exists idx_payment_allocations_payment_id on payment_allocations(payment_id);
create index if not exists idx_payment_allocations_installment_id on payment_allocations(installment_id);
create index if not exists idx_payment_allocations_status on payment_allocations(status);

alter table categories enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table profiles enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table installments enable row level security;
alter table payments enable row level security;
alter table payment_allocations enable row level security;

create policy "Public can read active categories"
  on categories for select
  using (is_active = true);

create policy "Public can read active products"
  on products for select
  using (status = 'ACTIVE');

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = user_id);

create policy "Users can update own basic profile"
  on profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, role, full_name)
  values (
    new.id,
    'CUSTOMER',
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- Phase 1 writes are intended to go through the Next.js API using SUPABASE_SERVICE_ROLE_KEY.
-- Do not add public insert/update policies for customers, sales, or sale_items unless you accept anonymous writes.

create or replace function create_checkout_sale(
  p_checkout_request_id text,
  p_customer jsonb,
  p_items jsonb,
  p_payment_method_requested text default null,
  p_payment_plan_type payment_plan_type default 'FULL_PAYMENT',
  p_installments_count integer default 1,
  p_first_due_date date default null
)
returns table (
  persisted boolean,
  sale_id uuid,
  sale_number text,
  sale_status sale_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_sale_id uuid;
  v_sale_number text;
  v_sale_status sale_status;
  v_subtotal numeric(12, 2);
  v_discount numeric(12, 2);
  v_total numeric(12, 2);
  v_item_count integer;
  v_phone text;
  v_email text;
  v_installment_number integer;
  v_installment_amount numeric(12, 2);
  v_due_date date;
begin
  if nullif(trim(p_checkout_request_id), '') is null then
    raise exception 'checkout_request_id is required';
  end if;

  if p_customer is null or jsonb_typeof(p_customer) <> 'object' then
    raise exception 'customer payload must be an object';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items payload must be a non-empty array';
  end if;

  select s.id, s.sale_number, s.sale_status
  into v_sale_id, v_sale_number, v_sale_status
  from sales s
  where s.checkout_request_id = p_checkout_request_id
  limit 1;

  if v_sale_id is not null then
    return query select (v_sale_status <> 'CANCELLED'::sale_status), v_sale_id, v_sale_number, v_sale_status;
    return;
  end if;

  v_phone := nullif(trim(coalesce(p_customer->>'phone', '')), '');
  v_email := nullif(lower(trim(coalesce(p_customer->>'email', ''))), '');

  if v_phone is not null then
    select id into v_customer_id
    from customers
    where phone = v_phone
    limit 1;
  end if;

  if v_customer_id is null and v_email is not null then
    select id into v_customer_id
    from customers
    where lower(email) = v_email
    limit 1;
  end if;

  if v_customer_id is null then
    begin
      insert into customers (
        full_name,
        phone,
        email,
        address,
        city
      ) values (
        trim(p_customer->>'fullName'),
        v_phone,
        v_email,
        nullif(trim(coalesce(p_customer->>'address', '')), ''),
        nullif(trim(coalesce(p_customer->>'city', '')), '')
      )
      returning id into v_customer_id;
    exception when unique_violation then
      select id into v_customer_id
      from customers
      where (v_phone is not null and phone = v_phone)
         or (v_email is not null and lower(email) = v_email)
      limit 1;
    end;
  end if;

  if v_customer_id is null then
    raise exception 'could not create or reuse customer';
  end if;

  select
    coalesce(sum((item->>'lineSubtotal')::numeric), 0)::numeric(12, 2),
    coalesce(sum((item->>'lineDiscountAmount')::numeric), 0)::numeric(12, 2),
    coalesce(sum((item->>'lineTotal')::numeric), 0)::numeric(12, 2),
    coalesce(sum((item->>'quantity')::integer), 0)::integer
  into v_subtotal, v_discount, v_total, v_item_count
  from jsonb_array_elements(p_items) item;

  if v_item_count <= 0 or v_total < 0 or v_subtotal < 0 or v_discount < 0 then
    raise exception 'invalid sale totals';
  end if;

  if p_payment_plan_type = 'FULL_PAYMENT' then
    p_installments_count := 1;
  end if;

  if p_installments_count < 1 then
    raise exception 'installments_count must be greater than zero';
  end if;

  if p_payment_plan_type = 'INSTALLMENTS' and p_installments_count < 2 then
    raise exception 'installment sales require at least 2 installments';
  end if;

  insert into sales (
    checkout_request_id,
    customer_id,
    sale_status,
    subtotal_amount,
    discount_amount,
    total_amount,
    paid_amount,
    remaining_amount,
    collection_status,
    item_count,
    payment_plan_type,
    installments_count,
    payment_method_requested,
    delivery_full_name,
    delivery_phone,
    delivery_address,
    delivery_city,
    notes
  ) values (
    p_checkout_request_id,
    v_customer_id,
    case
      when p_payment_plan_type = 'INSTALLMENTS' or p_installments_count > 1 then 'UP_TO_DATE'::collection_status
      else 'PENDING'::collection_status
    end,
    v_subtotal,
    v_discount,
    v_total,
    0,
    v_total,
    'PENDING',
    v_item_count,
    p_payment_plan_type,
    p_installments_count,
    nullif(trim(coalesce(p_payment_method_requested, '')), ''),
    trim(p_customer->>'fullName'),
    v_phone,
    nullif(trim(coalesce(p_customer->>'address', '')), ''),
    nullif(trim(coalesce(p_customer->>'city', '')), ''),
    'Venta creada atomically desde checkout antes de abrir WhatsApp.'
  )
  returning id, sales.sale_number, sales.sale_status
  into v_sale_id, v_sale_number, v_sale_status;

  insert into sale_items (
    sale_id,
    legacy_product_id,
    product_name_snapshot,
    product_slug_snapshot,
    category_name_snapshot,
    unit_price_snapshot,
    quantity,
    line_subtotal,
    line_discount_amount,
    line_total,
    image_url_snapshot
  )
  select
    v_sale_id,
    nullif(item->>'legacyProductId', '')::integer,
    item->>'name',
    nullif(item->>'slug', ''),
    nullif(item->>'category', ''),
    (item->>'unitPrice')::numeric(12, 2),
    (item->>'quantity')::integer,
    (item->>'lineSubtotal')::numeric(12, 2),
    (item->>'lineDiscountAmount')::numeric(12, 2),
    (item->>'lineTotal')::numeric(12, 2),
    nullif(item->>'imageUrl', '')
  from jsonb_array_elements(p_items) item;

  if p_payment_plan_type = 'INSTALLMENTS' or p_installments_count > 1 then
    for v_installment_number in 1..p_installments_count loop
      if v_installment_number < p_installments_count then
        v_installment_amount := trunc((v_total / p_installments_count) * 100) / 100;
      else
        v_installment_amount := v_total - ((trunc((v_total / p_installments_count) * 100) / 100) * (p_installments_count - 1));
      end if;

      v_due_date := (
        coalesce(p_first_due_date, (current_date + interval '1 month')::date)
        + ((v_installment_number - 1) * interval '1 month')
      )::date;

      insert into installments (
        sale_id,
        installment_number,
        due_date,
        original_amount,
        paid_amount,
        remaining_amount,
        status
      ) values (
        v_sale_id,
        v_installment_number,
        v_due_date,
        v_installment_amount,
        0,
        v_installment_amount,
        'PENDING'
      );
    end loop;
  end if;

  return query select true, v_sale_id, v_sale_number, v_sale_status;
exception when unique_violation then
  select s.id, s.sale_number, s.sale_status
  into v_sale_id, v_sale_number, v_sale_status
  from sales s
  where s.checkout_request_id = p_checkout_request_id
  limit 1;

  if v_sale_id is not null then
    return query select (v_sale_status <> 'CANCELLED'::sale_status), v_sale_id, v_sale_number, v_sale_status;
    return;
  end if;

  raise;
end;
$$;

create or replace function register_sale_payment(
  p_sale_id uuid,
  p_amount numeric,
  p_payment_method payment_method,
  p_payment_date timestamptz default now(),
  p_notes text default null
)
returns table (
  payment_id uuid,
  total_allocated numeric,
  sale_paid_amount numeric,
  sale_remaining_amount numeric,
  collection_status collection_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale record;
  v_payment_id uuid;
  v_remaining_to_allocate numeric(12, 2);
  v_allocation_amount numeric(12, 2);
  v_installment record;
  v_total_allocated numeric(12, 2) := 0;
  v_new_sale_paid numeric(12, 2);
  v_new_sale_remaining numeric(12, 2);
  v_collection_status collection_status;
begin
  if p_sale_id is null then
    raise exception 'sale_id is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'payment amount must be greater than zero';
  end if;

  select * into v_sale
  from sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'sale not found';
  end if;

  if v_sale.sale_status = 'CANCELLED' then
    raise exception 'cannot register payments for cancelled sales';
  end if;

  if p_amount > v_sale.remaining_amount then
    raise exception 'payment amount exceeds remaining sale debt';
  end if;

  if not exists (
    select 1 from installments
    where sale_id = p_sale_id and remaining_amount > 0
  ) then
    raise exception 'sale has no payable installments';
  end if;

  insert into payments (
    sale_id,
    customer_id,
    amount,
    payment_method,
    status,
    payment_date,
    notes
  ) values (
    p_sale_id,
    v_sale.customer_id,
    p_amount,
    p_payment_method,
    'CONFIRMED',
    coalesce(p_payment_date, now()),
    nullif(trim(coalesce(p_notes, '')), '')
  ) returning id into v_payment_id;

  v_remaining_to_allocate := p_amount;

  for v_installment in
    select *
    from installments
    where sale_id = p_sale_id
      and remaining_amount > 0
      and status in ('PENDING', 'PARTIALLY_PAID', 'OVERDUE')
    order by due_date asc, installment_number asc
    for update
  loop
    exit when v_remaining_to_allocate <= 0;

    v_allocation_amount := least(v_remaining_to_allocate, v_installment.remaining_amount);

    insert into payment_allocations (
      payment_id,
      installment_id,
      amount,
      status
    ) values (
      v_payment_id,
      v_installment.id,
      v_allocation_amount,
      'ACTIVE'
    );

    update installments
    set
      paid_amount = paid_amount + v_allocation_amount,
      remaining_amount = remaining_amount - v_allocation_amount,
      status = case
        when remaining_amount - v_allocation_amount = 0 then 'PAID'::installment_status
        else 'PARTIALLY_PAID'::installment_status
      end,
      updated_at = now()
    where id = v_installment.id;

    v_remaining_to_allocate := v_remaining_to_allocate - v_allocation_amount;
    v_total_allocated := v_total_allocated + v_allocation_amount;
  end loop;

  if v_remaining_to_allocate <> 0 then
    raise exception 'payment could not be fully allocated to installments';
  end if;

  if v_total_allocated <> p_amount then
    raise exception 'payment allocations do not match payment amount';
  end if;

  v_new_sale_paid := v_sale.paid_amount + p_amount;
  v_new_sale_remaining := v_sale.remaining_amount - p_amount;
  v_collection_status := case
    when v_new_sale_remaining = 0 then 'PAID'::collection_status
    when exists (
      select 1
      from installments
      where sale_id = p_sale_id
        and due_date < current_date
        and remaining_amount > 0
    ) then 'OVERDUE'::collection_status
    else 'UP_TO_DATE'::collection_status
  end;

  update sales
  set
    paid_amount = v_new_sale_paid,
    remaining_amount = v_new_sale_remaining,
    collection_status = v_collection_status,
    updated_at = now()
  where id = p_sale_id;

  return query select
    v_payment_id,
    v_total_allocated,
    v_new_sale_paid,
    v_new_sale_remaining,
    v_collection_status;
end;
$$;

create or replace function refresh_financial_statuses()
returns table (
  overdue_installments_updated integer,
  sales_updated integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_overdue_count integer := 0;
  v_sales_count integer := 0;
begin
  update installments
  set
    status = 'PAID',
    updated_at = now()
  where remaining_amount = 0
    and status <> 'PAID';

  update installments
  set
    status = 'OVERDUE',
    updated_at = now()
  where due_date < current_date
    and remaining_amount > 0
    and status in ('PENDING', 'PARTIALLY_PAID');

  get diagnostics v_overdue_count = row_count;

  update sales s
  set
    collection_status = case
      when s.remaining_amount = 0 then 'PAID'::collection_status
      when exists (
        select 1
        from installments i
        where i.sale_id = s.id
          and i.remaining_amount > 0
          and i.due_date < current_date
      ) then 'OVERDUE'::collection_status
      when exists (
        select 1
        from installments i
        where i.sale_id = s.id
          and i.remaining_amount > 0
      ) then 'UP_TO_DATE'::collection_status
      else 'PENDING'::collection_status
    end,
    updated_at = now()
  where s.sale_status <> 'CANCELLED';

  get diagnostics v_sales_count = row_count;

  return query select v_overdue_count, v_sales_count;
end;
$$;
