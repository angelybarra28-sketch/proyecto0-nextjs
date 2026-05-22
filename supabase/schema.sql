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
  item_count integer not null default 0 check (item_count >= 0),
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

create index if not exists idx_sale_items_sale_id on sale_items(sale_id);
create index if not exists idx_sale_items_product_id on sale_items(product_id);
create index if not exists idx_sale_items_legacy_product_id on sale_items(legacy_product_id);
create index if not exists idx_sale_items_product_created on sale_items(product_id, created_at);
create index if not exists idx_sale_items_category_created on sale_items(category_name_snapshot, created_at);
create unique index if not exists idx_sale_items_sale_legacy_unique
  on sale_items(sale_id, legacy_product_id)
  where legacy_product_id is not null;

alter table categories enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;

create policy "Public can read active categories"
  on categories for select
  using (is_active = true);

create policy "Public can read active products"
  on products for select
  using (status = 'ACTIVE');

-- Phase 1 writes are intended to go through the Next.js API using SUPABASE_SERVICE_ROLE_KEY.
-- Do not add public insert/update policies for customers, sales, or sale_items unless you accept anonymous writes.

create or replace function create_checkout_sale(
  p_checkout_request_id text,
  p_customer jsonb,
  p_items jsonb,
  p_payment_method_requested text default null
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

  insert into sales (
    checkout_request_id,
    customer_id,
    sale_status,
    subtotal_amount,
    discount_amount,
    total_amount,
    paid_amount,
    remaining_amount,
    item_count,
    payment_method_requested,
    delivery_full_name,
    delivery_phone,
    delivery_address,
    delivery_city,
    notes
  ) values (
    p_checkout_request_id,
    v_customer_id,
    'PENDING',
    v_subtotal,
    v_discount,
    v_total,
    0,
    v_total,
    v_item_count,
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
