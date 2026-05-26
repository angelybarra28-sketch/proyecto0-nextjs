import assert from 'node:assert/strict';
import test from 'node:test';
import { createRunId, createTestDbClient } from '../helpers/testDb.mjs';
import { resetDatabase } from '../helpers/resetDatabase.mjs';
import { checkoutItem, createCheckoutSale, getSaleDetailRows, registerPayment, seedProduct } from '../helpers/seedFinancialFixtures.mjs';

const dbTest = test;

dbTest('refresh_financial_statuses updates installment and sale collection statuses', async () => {
  const supabase = createTestDbClient();
  const runId = createRunId('refresh-status');

  try {
    const product = await seedProduct(supabase, runId, { stock: 10, price: 1200 });
    const overdueSale = await createCheckoutSale(supabase, runId, [checkoutItem(product, 1)], {
      paymentPlanType: 'INSTALLMENTS',
      installmentsCount: 1,
      firstDueDate: '2020-01-01',
    });
    const paidSale = await createCheckoutSale(supabase, runId, [checkoutItem(product, 1)], {
      paymentPlanType: 'INSTALLMENTS',
      installmentsCount: 1,
      firstDueDate: '2020-01-01',
    });
    const upToDateSale = await createCheckoutSale(supabase, runId, [checkoutItem(product, 1)], {
      paymentPlanType: 'INSTALLMENTS',
      installmentsCount: 1,
      firstDueDate: '2999-01-01',
    });
    await registerPayment(supabase, paidSale.sale_id, { amount: 1200, paymentRequestId: `${runId}-paid` });

    const { error } = await supabase.rpc('refresh_financial_statuses');
    if (error) throw error;

    const overdueDetail = await getSaleDetailRows(supabase, overdueSale.sale_id);
    const paidDetail = await getSaleDetailRows(supabase, paidSale.sale_id);
    const upToDateDetail = await getSaleDetailRows(supabase, upToDateSale.sale_id);

    assert.equal(overdueDetail.installments[0].status, 'OVERDUE');
    assert.equal(overdueDetail.sale.collection_status, 'OVERDUE');
    assert.equal(paidDetail.installments[0].status, 'PAID');
    assert.equal(paidDetail.sale.collection_status, 'PAID');
    assert.equal(upToDateDetail.sale.collection_status, 'UP_TO_DATE');
  } finally {
    await resetDatabase(supabase, runId);
  }
});

dbTest('get_admin_dashboard_analytics returns expected shape and core metrics', async () => {
  const supabase = createTestDbClient();
  const runId = createRunId('analytics');

  try {
    const topProduct = await seedProduct(supabase, runId, { stock: 20, price: 300, name: `Top ${runId}` });
    await seedProduct(supabase, runId, { stock: 0, price: 100, name: `Zero ${runId}` });
    await seedProduct(supabase, runId, { stock: 3, price: 100, name: `Low ${runId}` });
    const sale = await createCheckoutSale(supabase, runId, [checkoutItem(topProduct, 2)], {
      paymentPlanType: 'INSTALLMENTS',
      installmentsCount: 2,
      firstDueDate: '2020-01-01',
    });
    await registerPayment(supabase, sale.sale_id, { amount: 300, paymentRequestId: `${runId}-partial` });
    await supabase.rpc('refresh_financial_statuses');

    const { data, error } = await supabase.rpc('get_admin_dashboard_analytics').single();
    if (error) throw error;

    assert.equal(typeof data.current_month_sales_count, 'number');
    assert.equal(Array.isArray(data.monthly), true);
    assert.equal(Array.isArray(data.daily_sales), true);
    assert.equal(Array.isArray(data.aging_buckets), true);
    assert.equal(Array.isArray(data.top_products), true);
    assert.equal(Array.isArray(data.top_categories), true);
    assert.equal(Array.isArray(data.top_customers), true);
    assert.ok(data.customers_with_debt >= 1);
    assert.ok(data.product_health.outOfStock >= 1);
    assert.ok(data.product_health.lowStock >= 1);
    assert.ok(data.top_products.some((product) => product.label === topProduct.name));
  } finally {
    await resetDatabase(supabase, runId);
  }
});
