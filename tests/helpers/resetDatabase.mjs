export async function resetDatabase(supabase, runId) {
  const checkoutPrefix = `${runId}-checkout`;
  const { data: sales } = await supabase
    .from('sales')
    .select('id, customer_id')
    .like('checkout_request_id', `${checkoutPrefix}%`);
  const saleIds = (sales ?? []).map((sale) => sale.id);
  const customerIds = Array.from(new Set((sales ?? []).map((sale) => sale.customer_id).filter(Boolean)));

  if (saleIds.length > 0) {
    const { data: payments } = await supabase
      .from('payments')
      .select('id')
      .in('sale_id', saleIds);
    const paymentIds = (payments ?? []).map((payment) => payment.id);

    if (paymentIds.length > 0) {
      await supabase.from('payment_allocations').delete().in('payment_id', paymentIds);
      await supabase.from('payments').delete().in('id', paymentIds);
    }

    await supabase.from('installments').delete().in('sale_id', saleIds);
    await supabase.from('sale_items').delete().in('sale_id', saleIds);
    await supabase.from('sales').delete().in('id', saleIds);
  }

  if (customerIds.length > 0) {
    await supabase.from('customers').delete().in('id', customerIds);
  }

  await supabase.from('customers').delete().like('email', `${runId}-%@example.test`);
  await supabase.from('products').delete().like('slug', `${runId}-%`);
  await supabase.from('categories').delete().like('slug', `${runId}-%`);
}
