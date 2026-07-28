alter table customers add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists idx_customers_user_id on customers(user_id) where user_id is not null;

alter table credit_installments enable row level security;
alter table credit_account_items enable row level security;
alter table credit_collection_notes enable row level security;

create policy "Customers can read own record"
  on customers for select
  using (user_id = auth.uid());

create policy "Customers can read own credit accounts"
  on credit_accounts for select
  using (
    customer_id in (
      select id from customers where user_id = auth.uid()
    )
  );

create policy "Customers can read own credit installments"
  on credit_installments for select
  using (
    credit_account_id in (
      select ca.id from credit_accounts ca
      join customers c on c.id = ca.customer_id
      where c.user_id = auth.uid()
    )
  );

create policy "Customers can read own credit payments"
  on credit_payments for select
  using (
    credit_account_id in (
      select ca.id from credit_accounts ca
      join customers c on c.id = ca.customer_id
      where c.user_id = auth.uid()
    )
  );

create policy "Customers can read own credit account items"
  on credit_account_items for select
  using (
    credit_account_id in (
      select ca.id from credit_accounts ca
      join customers c on c.id = ca.customer_id
      where c.user_id = auth.uid()
    )
  );

create policy "Customers can read own credit collection notes"
  on credit_collection_notes for select
  using (
    credit_account_id in (
      select ca.id from credit_accounts ca
      join customers c on c.id = ca.customer_id
      where c.user_id = auth.uid()
    )
  );
