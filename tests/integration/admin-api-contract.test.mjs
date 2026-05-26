import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

test('admin product mutation route requires admin auth and audit logging', () => {
  const route = read('app/api/admin/products/[id]/route.ts');
  assert.match(route, /requireAdminUser/);
  assert.match(route, /logAdminAction/);
});

test('admin payment route requires admin auth and audit logging', () => {
  const route = read('app/api/admin/sales/[id]/payments/route.ts');
  assert.match(route, /requireAdminUser/);
  assert.match(route, /logAdminAction/);
  assert.match(route, /paymentRequestId/);
});

test('product image route requires strict admin auth and validates product id', () => {
  const route = read('app/api/admin/products/images/route.ts');
  const service = read('lib/services/admin/productImages.ts');
  assert.match(route, /requireStrictAdminUser/);
  assert.match(service, /getProductById/);
  assert.match(service, /assertValidProductImagePath/);
});
