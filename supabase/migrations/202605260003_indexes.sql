create index if not exists idx_categories_slug on categories(slug);
create index if not exists idx_categories_active on categories(is_active);
create index if not exists idx_categories_parent_id on categories(parent_id);

create index if not exists idx_products_legacy_product_id on products(legacy_product_id);
create index if not exists idx_products_slug on products(slug);
create index if not exists idx_products_category_id on products(category_id);
create index if not exists idx_products_status on products(status);
create index if not exists idx_products_featured on products(featured);
create index if not exists idx_products_price on products(price);
create index if not exists idx_products_status_featured_name on products(status, featured, name);
create index if not exists idx_products_status_category_name on products(status, category_id, name);
create index if not exists idx_products_name_trgm on products using gin (name gin_trgm_ops);
create index if not exists idx_products_slug_trgm on products using gin (slug gin_trgm_ops);

create index if not exists idx_customers_dni on customers(dni);
create index if not exists idx_customers_phone on customers(phone);
create index if not exists idx_customers_email on customers(email);
create index if not exists idx_customers_full_name on customers(full_name);
create unique index if not exists idx_customers_phone_unique on customers(phone) where phone is not null and phone <> '';
create unique index if not exists idx_customers_email_lower_unique on customers(lower(email)) where email is not null and email <> '';

create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_is_active on profiles(is_active);

create index if not exists idx_sales_customer_id on sales(customer_id);
create index if not exists idx_sales_sale_number on sales(sale_number);
create index if not exists idx_sales_checkout_request_id on sales(checkout_request_id);
create index if not exists idx_sales_sale_status on sales(sale_status);
create index if not exists idx_sales_sale_date on sales(sale_date);
create index if not exists idx_sales_customer_date on sales(customer_id, sale_date);
create index if not exists idx_sales_payment_plan_type on sales(payment_plan_type);
create index if not exists idx_sales_collection_status on sales(collection_status);
create index if not exists idx_sales_collection_status_date on sales(collection_status, sale_date desc);
create index if not exists idx_sales_status_date on sales(sale_status, sale_date desc);
create index if not exists idx_sales_sale_number_trgm on sales using gin (sale_number gin_trgm_ops);
create index if not exists idx_sales_delivery_full_name_trgm on sales using gin (delivery_full_name gin_trgm_ops);
create index if not exists idx_sales_delivery_phone_trgm on sales using gin (delivery_phone gin_trgm_ops);

create index if not exists idx_sale_items_sale_id on sale_items(sale_id);
create index if not exists idx_sale_items_product_id on sale_items(product_id);
create index if not exists idx_sale_items_legacy_product_id on sale_items(legacy_product_id);
create index if not exists idx_sale_items_product_created on sale_items(product_id, created_at);
create index if not exists idx_sale_items_category_created on sale_items(category_name_snapshot, created_at);
create unique index if not exists idx_sale_items_sale_legacy_unique on sale_items(sale_id, legacy_product_id) where legacy_product_id is not null;

create index if not exists idx_installments_sale_id on installments(sale_id);
create index if not exists idx_installments_due_date on installments(due_date);
create index if not exists idx_installments_status on installments(status);
create index if not exists idx_installments_status_due_date on installments(status, due_date);
create index if not exists idx_installments_sale_status_due_date on installments(sale_id, status, due_date);

create index if not exists idx_payments_sale_id on payments(sale_id);
create index if not exists idx_payments_customer_id on payments(customer_id);
create index if not exists idx_payments_payment_date on payments(payment_date);
create index if not exists idx_payments_status on payments(status);
create index if not exists idx_payments_status_payment_date on payments(status, payment_date desc);
create unique index if not exists idx_payments_payment_request_id_unique on payments(payment_request_id) where payment_request_id is not null and payment_request_id <> '';

create index if not exists idx_payment_allocations_payment_id on payment_allocations(payment_id);
create index if not exists idx_payment_allocations_installment_id on payment_allocations(installment_id);
create index if not exists idx_payment_allocations_status on payment_allocations(status);

create index if not exists idx_admin_audit_logs_admin_user_id on admin_audit_logs(admin_user_id);
create index if not exists idx_admin_audit_logs_entity on admin_audit_logs(entity, entity_id);
create index if not exists idx_admin_audit_logs_action_created_at on admin_audit_logs(action, created_at desc);
