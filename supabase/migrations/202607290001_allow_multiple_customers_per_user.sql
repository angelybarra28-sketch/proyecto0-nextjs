-- Allow multiple customers per auth user (remove unique constraint on user_id)
drop index if exists idx_customers_user_id;
create index if not exists idx_customers_user_id on customers(user_id);
