alter table categories enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table profiles enable row level security;
alter table admin_audit_logs enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table installments enable row level security;
alter table payments enable row level security;
alter table payment_allocations enable row level security;

create policy "Public can read active categories" on categories for select using (is_active = true);
create policy "Public can read active products" on products for select using (status = 'ACTIVE');
create policy "Users can read own profile" on profiles for select using (auth.uid() = user_id);
create policy "Users can update own basic profile" on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
