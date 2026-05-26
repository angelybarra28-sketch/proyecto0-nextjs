export async function seedCategory(supabase, runId) {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: `Test Category ${runId}`,
      slug: `${runId}-category`,
      is_active: true,
    })
    .select('id, name, slug')
    .single();

  if (error) throw error;
  return data;
}

export async function seedProduct(supabase, runId, overrides = {}) {
  const category = overrides.category ?? await seedCategory(supabase, `${runId}-${overrides.legacyProductId ?? 'default'}`);
  const legacyProductId = overrides.legacyProductId ?? Math.floor(100000000 + Math.random() * 800000000);
  const name = overrides.name ?? `Product ${legacyProductId}`;
  const price = overrides.price ?? 1000;

  const { data, error } = await supabase
    .from('products')
    .insert({
      legacy_product_id: legacyProductId,
      category_id: category.id,
      name,
      slug: `${runId}-${legacyProductId}`,
      description: 'DB integration product',
      price,
      compare_at_price: null,
      discount_label: null,
      stock: overrides.stock ?? 10,
      status: overrides.status ?? 'ACTIVE',
      featured: false,
      image_url: `https://example.test/${runId}-${legacyProductId}.jpg`,
      carousel_images: [],
      specifications: {},
      features: [],
    })
    .select('id, legacy_product_id, name, slug, price, stock, status, categories:category_id (name)')
    .single();

  if (error) throw error;
  return data;
}

export function checkoutCustomer(runId, suffix = 'customer') {
  return {
    fullName: `Customer ${runId} ${suffix}`,
    phone: `${Math.floor(1000000000 + Math.random() * 8999999999)}`,
    email: `${runId}-${suffix}@example.test`,
    address: 'Test address',
    city: 'Test city',
  };
}

export function checkoutItem(product, quantity, overrides = {}) {
  const unitPrice = Number(product.price);
  return {
    legacyProductId: product.legacy_product_id,
    name: product.name,
    slug: product.slug,
    category: Array.isArray(product.categories) ? product.categories[0]?.name : product.categories?.name,
    unitPrice: overrides.unitPrice ?? unitPrice,
    quantity,
    lineSubtotal: overrides.lineSubtotal ?? unitPrice * quantity,
    lineDiscountAmount: overrides.lineDiscountAmount ?? 0,
    lineTotal: overrides.lineTotal ?? unitPrice * quantity,
    imageUrl: overrides.imageUrl ?? null,
  };
}

export async function createCheckoutSale(supabase, runId, items, overrides = {}) {
  const checkoutRequestId = overrides.checkoutRequestId ?? `${runId}-checkout-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await supabase
    .rpc('create_checkout_sale', {
      p_checkout_request_id: checkoutRequestId,
      p_customer: overrides.customer ?? checkoutCustomer(runId, checkoutRequestId),
      p_items: items,
      p_payment_method_requested: overrides.paymentMethodRequested ?? 'cash',
      p_payment_plan_type: overrides.paymentPlanType ?? 'FULL_PAYMENT',
      p_installments_count: overrides.installmentsCount ?? 1,
      p_first_due_date: overrides.firstDueDate ?? null,
    })
    .single();

  if (error) throw error;
  return { ...data, checkoutRequestId };
}

export async function getSaleDetailRows(supabase, saleId) {
  const [saleResult, itemsResult, installmentsResult, paymentsResult] = await Promise.all([
    supabase.from('sales').select('*').eq('id', saleId).single(),
    supabase.from('sale_items').select('*').eq('sale_id', saleId),
    supabase.from('installments').select('*').eq('sale_id', saleId).order('installment_number'),
    supabase.from('payments').select('*, payment_allocations (*)').eq('sale_id', saleId),
  ]);

  if (saleResult.error) throw saleResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (installmentsResult.error) throw installmentsResult.error;
  if (paymentsResult.error) throw paymentsResult.error;

  return {
    sale: saleResult.data,
    items: itemsResult.data ?? [],
    installments: installmentsResult.data ?? [],
    payments: paymentsResult.data ?? [],
  };
}

export async function registerPayment(supabase, saleId, input = {}) {
  const { data, error } = await supabase
    .rpc('register_sale_payment', {
      p_sale_id: saleId,
      p_payment_request_id: input.paymentRequestId ?? `${saleId}-${Math.random().toString(36).slice(2, 8)}`,
      p_amount: input.amount,
      p_payment_method: input.paymentMethod ?? 'CASH',
      p_payment_date: input.paymentDate ?? new Date().toISOString(),
      p_notes: input.notes ?? null,
    })
    .single();

  if (error) throw error;
  return data;
}
