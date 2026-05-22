import { createSale, createSaleItems, updateSaleStatus } from '@/lib/repositories/saleRepository';
import { findOrCreateCustomer } from '@/lib/repositories/customerRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { allProducts } from '@/lib/products';
import type { CheckoutSaleInput, CheckoutSaleResult, SaleItemInsert } from '@/lib/supabase/types';

export async function persistCheckoutSale(input: CheckoutSaleInput): Promise<CheckoutSaleResult> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { persisted: false };
  }

  const subtotal = input.items.reduce((total, item) => {
    const unitSubtotal = item.originalPrice ?? item.price;
    return total + unitSubtotal * item.quantity;
  }, 0);
  const total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.max(0, subtotal - total);
  const itemCount = input.items.reduce((sum, item) => sum + item.quantity, 0);

  const customer = await findOrCreateCustomer(supabase, {
    full_name: input.customer.fullName,
    phone: input.customer.phone || null,
    email: input.customer.email || null,
    address: input.customer.address,
    city: input.customer.city,
  });

  const sale = await createSale(supabase, {
    customer_id: customer.id,
    sale_status: 'PENDING',
    subtotal_amount: subtotal,
    discount_amount: discount,
    total_amount: total,
    paid_amount: 0,
    remaining_amount: total,
    item_count: itemCount,
    payment_method_requested: input.paymentMethodRequested || null,
    delivery_full_name: input.customer.fullName,
    delivery_phone: input.customer.phone || null,
    delivery_address: input.customer.address,
    delivery_city: input.customer.city,
    notes: 'Venta creada desde checkout antes de abrir WhatsApp.',
  });

  const saleItems: SaleItemInsert[] = input.items.map((item) => {
    const catalogProduct = allProducts.find((product) => product.id === item.legacyProductId);
    const unitSubtotal = item.originalPrice ?? item.price;
    const lineSubtotal = unitSubtotal * item.quantity;
    const lineTotal = item.price * item.quantity;

    return {
      sale_id: sale.id,
      legacy_product_id: item.legacyProductId,
      product_name_snapshot: catalogProduct?.name ?? item.name,
      product_slug_snapshot: catalogProduct?.slug ?? null,
      category_name_snapshot: catalogProduct?.categoria ?? null,
      unit_price_snapshot: item.price,
      quantity: item.quantity,
      line_subtotal: lineSubtotal,
      line_discount_amount: Math.max(0, lineSubtotal - lineTotal),
      line_total: lineTotal,
      image_url_snapshot: catalogProduct?.imageUrl ?? item.imageUrl ?? null,
    };
  });

  try {
    await createSaleItems(supabase, saleItems);
  } catch (error) {
    await updateSaleStatus(
      supabase,
      sale.id,
      'CANCELLED',
      'Venta cancelada automaticamente: no se pudieron crear los items snapshot.'
    );
    throw error;
  }

  return {
    persisted: true,
    saleId: sale.id,
    saleNumber: sale.sale_number,
  };
}
