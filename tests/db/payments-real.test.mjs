import assert from 'node:assert/strict';
import test from 'node:test';
import { createRunId, createTestDbClient, expectRpcError } from '../helpers/testDb.mjs';
import { resetDatabase } from '../helpers/resetDatabase.mjs';
import { checkoutItem, createCheckoutSale, getSaleDetailRows, registerPayment, seedProduct } from '../helpers/seedFinancialFixtures.mjs';

const dbTest = test;

dbTest('register_sale_payment handles partial, full and multiple allocations', async () => {
  const supabase = createTestDbClient();
  const runId = createRunId('payment-flow');

  try {
    const product = await seedProduct(supabase, runId, { stock: 10, price: 900 });
    const sale = await createCheckoutSale(supabase, runId, [checkoutItem(product, 3)], {
      paymentPlanType: 'INSTALLMENTS',
      installmentsCount: 3,
      firstDueDate: new Date().toISOString().slice(0, 10),
    });

    await registerPayment(supabase, sale.sale_id, { amount: 450, paymentRequestId: `${runId}-payment-partial` });
    let detail = await getSaleDetailRows(supabase, sale.sale_id);
    assert.equal(detail.sale.remaining_amount, '2250.00');
    assert.equal(detail.installments[0].status, 'PARTIALLY_PAID');

    await registerPayment(supabase, sale.sale_id, { amount: 1350, paymentRequestId: `${runId}-payment-multi` });
    detail = await getSaleDetailRows(supabase, sale.sale_id);
    assert.equal(detail.installments[0].status, 'PAID');
    assert.equal(detail.installments[1].status, 'PAID');
    assert.equal(detail.sale.remaining_amount, '900.00');
    assert.equal(detail.payments.flatMap((payment) => payment.payment_allocations).length, 3);

    await registerPayment(supabase, sale.sale_id, { amount: 900, paymentRequestId: `${runId}-payment-final` });
    detail = await getSaleDetailRows(supabase, sale.sale_id);
    assert.equal(detail.sale.remaining_amount, '0.00');
    assert.equal(detail.sale.collection_status, 'PAID');
    assert.equal(detail.installments.every((installment) => installment.status === 'PAID'), true);
  } finally {
    await resetDatabase(supabase, runId);
  }
});

dbTest('register_sale_payment is idempotent for the same payment_request_id', async () => {
  const supabase = createTestDbClient();
  const runId = createRunId('payment-idempotent');

  try {
    const product = await seedProduct(supabase, runId, { stock: 5, price: 500 });
    const sale = await createCheckoutSale(supabase, runId, [checkoutItem(product, 2)], { paymentPlanType: 'INSTALLMENTS', installmentsCount: 2 });
    const paymentRequestId = `${runId}-same-request`;
    const first = await registerPayment(supabase, sale.sale_id, { amount: 500, paymentRequestId });
    const second = await registerPayment(supabase, sale.sale_id, { amount: 500, paymentRequestId });
    const detail = await getSaleDetailRows(supabase, sale.sale_id);

    assert.equal(first.payment_id, second.payment_id);
    assert.equal(detail.payments.length, 1);
    assert.equal(detail.sale.remaining_amount, '500.00');
  } finally {
    await resetDatabase(supabase, runId);
  }
});

dbTest('register_sale_payment concurrent payments cannot overpay', async () => {
  const supabase = createTestDbClient();
  const runId = createRunId('payment-concurrent');

  try {
    const product = await seedProduct(supabase, runId, { stock: 5, price: 1000 });
    const sale = await createCheckoutSale(supabase, runId, [checkoutItem(product, 1)], { paymentPlanType: 'INSTALLMENTS', installmentsCount: 1 });
    const results = await Promise.all([
      supabase.rpc('register_sale_payment', {
        p_sale_id: sale.sale_id,
        p_payment_request_id: `${runId}-pay-a`,
        p_amount: 1000,
        p_payment_method: 'CASH',
        p_payment_date: new Date().toISOString(),
        p_notes: null,
      }).single(),
      supabase.rpc('register_sale_payment', {
        p_sale_id: sale.sale_id,
        p_payment_request_id: `${runId}-pay-b`,
        p_amount: 1000,
        p_payment_method: 'CASH',
        p_payment_date: new Date().toISOString(),
        p_notes: null,
      }).single(),
    ]);
    const successes = results.filter((result) => !result.error);
    const failures = results.filter((result) => result.error);
    const detail = await getSaleDetailRows(supabase, sale.sale_id);

    assert.equal(successes.length, 1);
    assert.equal(failures.length, 1);
    assert.match(failures[0].error.message, /(exceeds remaining sale debt|no payable installments)/);
    assert.equal(detail.sale.remaining_amount, '0.00');
    assert.equal(detail.payments.length, 1);
  } finally {
    await resetDatabase(supabase, runId);
  }
});

dbTest('register_sale_payment rolls back if amount cannot be allocated', async () => {
  const supabase = createTestDbClient();
  const runId = createRunId('payment-rollback');

  try {
    const product = await seedProduct(supabase, runId, { stock: 5, price: 1000 });
    const sale = await createCheckoutSale(supabase, runId, [checkoutItem(product, 1)], { paymentPlanType: 'INSTALLMENTS', installmentsCount: 1 });
    await supabase.from('installments').delete().eq('sale_id', sale.sale_id);
    await expectRpcError(
      supabase.rpc('register_sale_payment', {
        p_sale_id: sale.sale_id,
        p_payment_request_id: `${runId}-pay-no-installments`,
        p_amount: 500,
        p_payment_method: 'CASH',
        p_payment_date: new Date().toISOString(),
        p_notes: null,
      }),
      'no payable installments'
    );
    const detail = await getSaleDetailRows(supabase, sale.sale_id);
    assert.equal(detail.payments.length, 0);
    assert.equal(detail.sale.remaining_amount, '1000.00');
  } finally {
    await resetDatabase(supabase, runId);
  }
});
