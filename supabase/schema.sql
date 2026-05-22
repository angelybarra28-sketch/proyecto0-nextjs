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
  customer_id uuid not null references customers(id) on delete restrict,
  sale_status sale_status not null default 'PENDING',
  subtotal_amount numeric(12, 2) not null default 0 check (subtotal_amount >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  remaining_amount numeric(12, 2) not null default 0 check (remaining_amount >= 0),
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

create index if not exists idx_sales_customer_id on sales(customer_id);
create index if not exists idx_sales_sale_number on sales(sale_number);
create index if not exists idx_sales_sale_status on sales(sale_status);
create index if not exists idx_sales_sale_date on sales(sale_date);
create index if not exists idx_sales_customer_date on sales(customer_id, sale_date);

create index if not exists idx_sale_items_sale_id on sale_items(sale_id);
create index if not exists idx_sale_items_product_id on sale_items(product_id);
create index if not exists idx_sale_items_legacy_product_id on sale_items(legacy_product_id);
create index if not exists idx_sale_items_product_created on sale_items(product_id, created_at);
create index if not exists idx_sale_items_category_created on sale_items(category_name_snapshot, created_at);

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
