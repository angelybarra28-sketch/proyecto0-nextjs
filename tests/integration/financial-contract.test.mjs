import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');

test('register_sale_payment has idempotency boundary', () => {
  assert.match(schema, /payment_request_id text/);
  assert.match(schema, /idx_payments_payment_request_id_unique/);
  assert.match(schema, /p_payment_request_id/);
  assert.match(schema, /return query select\s+v_existing_payment\.id/s);
});

test('register_sale_payment rejects overpayment and locks sale rows', () => {
  assert.match(schema, /for update/);
  assert.match(schema, /payment amount exceeds remaining sale debt/);
});

test('register_sale_payment allocates partial payments to installments', () => {
  assert.match(schema, /least\(v_remaining_to_allocate, v_installment\.remaining_amount\)/);
  assert.match(schema, /PARTIALLY_PAID/);
  assert.match(schema, /payment_allocations/);
});

test('refresh_financial_statuses calculates overdue and collection status', () => {
  assert.match(schema, /create or replace function refresh_financial_statuses/);
  assert.match(schema, /status = 'OVERDUE'/);
  assert.match(schema, /collection_status = case/);
});

test('runtime contract validation covers critical financial objects', () => {
  assert.match(schema, /create or replace function validate_runtime_contract/);
  assert.match(schema, /register_sale_payment/);
  assert.match(schema, /create_checkout_sale/);
  assert.match(schema, /payments', 'payment_request_id/);
});

test('checkout decrements stock transactionally and rejects overselling', () => {
  assert.match(schema, /for v_item in select value from jsonb_array_elements\(p_items\)/);
  assert.match(schema, /from products\s+where legacy_product_id = v_legacy_product_id\s+for update/s);
  assert.match(schema, /insufficient stock for product/);
  assert.match(schema, /set stock = stock - v_quantity/);
});

test('checkout rejects inactive products and invalid quantities', () => {
  assert.match(schema, /product % is not active/);
  assert.match(schema, /item quantity must be greater than zero/);
  assert.match(schema, /product legacy id is required while hybrid catalog mode is enabled/);
});

test('analytics contract includes low stock and out of stock metrics', () => {
  assert.match(schema, /'outOfStock', count\(\*\) filter \(where stock <= 0\)/);
  assert.match(schema, /'lowStock', count\(\*\) filter \(where stock > 0 and stock <= 5\)/);
});
