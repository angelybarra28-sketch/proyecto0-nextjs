import assert from 'node:assert/strict';
import test from 'node:test';
import { createRunId, createTestDbClient, expectRpcError, assertRuntimeReady } from '../helpers/testDb.mjs';
import { resetDatabase } from '../helpers/resetDatabase.mjs';
import { checkoutItem, createCheckoutSale, getSaleDetailRows, seedProduct } from '../helpers/seedFinancialFixtures.mjs';

const dbTest = test;

dbTest('create_checkout_sale persists sale, snapshots and decrements stock', async () => {
  const supabase = createTestDbClient();
  await assertRuntimeReady(supabase);
  const runId = createRunId('checkout-success');

  try {
    const product = await seedProduct(supabase, runId, { stock: 5, price: 1500 });
    const sale = await createCheckoutSale(supabase, runId, [checkoutItem(product, 2)]);
    const detail = await getSaleDetailRows(supabase, sale.sale_id);
    const { data: updatedProduct, error } = await supabase.from('products').select('stock').eq('id', product.id).single();
    if (error) throw error;

    assert.equal(sale.persisted, true);
    assert.equal(detail.sale.total_amount, '3000.00');
    assert.equal(detail.items[0].product_name_snapshot, product.name);
    assert.equal(detail.items[0].unit_price_snapshot, '1500.00');
    assert.equal(updatedProduct.stock, 3);
  } finally {
    await resetDatabase(supabase, runId);
  }
});

dbTest('create_checkout_sale rolls back completely when one item has insufficient stock', async () => {
  const supabase = createTestDbClient();
  const runId = createRunId('checkout-rollback');

  try {
    const okProduct = await seedProduct(supabase, runId, { stock: 5, price: 100 });
    const noStockProduct = await seedProduct(supabase, runId, { stock: 0, price: 200 });
    const checkoutRequestId = `${runId}-checkout-rollback`;
    await expectRpcError(
      supabase.rpc('create_checkout_sale', {
        p_checkout_request_id: checkoutRequestId,
        p_customer: { fullName: 'Rollback User', address: 'A', city: 'C' },
        p_items: [checkoutItem(okProduct, 1), checkoutItem(noStockProduct, 1)],
        p_payment_method_requested: 'cash',
        p_payment_plan_type: 'FULL_PAYMENT',
        p_installments_count: 1,
        p_first_due_date: null,
      }),
      'insufficient stock'
    );

    const [{ data: saleRows }, { data: productRows }] = await Promise.all([
      supabase.from('sales').select('id').eq('checkout_request_id', checkoutRequestId),
      supabase.from('products').select('id, stock').in('id', [okProduct.id, noStockProduct.id]),
    ]);
    assert.equal(saleRows.length, 0);
    assert.equal(productRows.find((product) => product.id === okProduct.id).stock, 5);
    assert.equal(productRows.find((product) => product.id === noStockProduct.id).stock, 0);
  } finally {
    await resetDatabase(supabase, runId);
  }
});

dbTest('create_checkout_sale rejects inactive, invalid quantity and missing products', async () => {
  const supabase = createTestDbClient();
  const runId = createRunId('checkout-rejects');

  try {
    const inactiveProduct = await seedProduct(supabase, runId, { stock: 5, status: 'INACTIVE' });
    await expectRpcError(
      supabase.rpc('create_checkout_sale', {
        p_checkout_request_id: `${runId}-checkout-inactive`,
        p_customer: { fullName: 'Inactive User', address: 'A', city: 'C' },
        p_items: [checkoutItem(inactiveProduct, 1)],
        p_payment_method_requested: 'cash',
        p_payment_plan_type: 'FULL_PAYMENT',
        p_installments_count: 1,
        p_first_due_date: null,
      }),
      'is not active'
    );

    await expectRpcError(
      supabase.rpc('create_checkout_sale', {
        p_checkout_request_id: `${runId}-checkout-quantity`,
        p_customer: { fullName: 'Quantity User', address: 'A', city: 'C' },
        p_items: [{ ...checkoutItem(inactiveProduct, 1), quantity: 0 }],
        p_payment_method_requested: 'cash',
        p_payment_plan_type: 'FULL_PAYMENT',
        p_installments_count: 1,
        p_first_due_date: null,
      }),
      'quantity'
    );

    await expectRpcError(
      supabase.rpc('create_checkout_sale', {
        p_checkout_request_id: `${runId}-checkout-missing`,
        p_customer: { fullName: 'Missing User', address: 'A', city: 'C' },
        p_items: [{ ...checkoutItem(inactiveProduct, 1), legacyProductId: 999999991 }],
        p_payment_method_requested: 'cash',
        p_payment_plan_type: 'FULL_PAYMENT',
        p_installments_count: 1,
        p_first_due_date: null,
      }),
      'not found'
    );
  } finally {
    await resetDatabase(supabase, runId);
  }
});

dbTest('create_checkout_sale concurrency allows only one checkout for last stock unit', async () => {
  const supabase = createTestDbClient();
  const runId = createRunId('checkout-concurrency');

  try {
    const product = await seedProduct(supabase, runId, { stock: 1, price: 700 });
    const payload = (suffix) => supabase.rpc('create_checkout_sale', {
      p_checkout_request_id: `${runId}-checkout-${suffix}`,
      p_customer: { fullName: `Concurrent ${suffix}`, address: 'A', city: 'C' },
      p_items: [checkoutItem(product, 1)],
      p_payment_method_requested: 'cash',
      p_payment_plan_type: 'FULL_PAYMENT',
      p_installments_count: 1,
      p_first_due_date: null,
    }).single();

    const results = await Promise.all([payload('a'), payload('b')]);
    const successes = results.filter((result) => !result.error);
    const failures = results.filter((result) => result.error);
    const { data: updatedProduct, error } = await supabase.from('products').select('stock').eq('id', product.id).single();
    if (error) throw error;

    assert.equal(successes.length, 1);
    assert.equal(failures.length, 1);
    assert.match(failures[0].error.message, /insufficient stock/);
    assert.equal(updatedProduct.stock, 0);
  } finally {
    await resetDatabase(supabase, runId);
  }
});
