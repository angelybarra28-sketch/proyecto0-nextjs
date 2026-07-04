-- Product-Category many-to-many junction table.
-- Phase 1: create table, backfill existing data, add indexes.

create table if not exists product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

-- Backfill: migrate existing single category_id into junction table
insert into product_categories (product_id, category_id)
select id, category_id
from products
where category_id is not null
on conflict do nothing;

create index if not exists idx_product_categories_product_id
  on product_categories(product_id);
create index if not exists idx_product_categories_category_id
  on product_categories(category_id);

-- Grant same RLS as parent tables
alter table product_categories enable row level security;

create policy "Public can read product_categories"
  on product_categories for select
  using (true);
