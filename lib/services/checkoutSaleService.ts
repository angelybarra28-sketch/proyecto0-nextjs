import { createSale, createSaleItems } from '@/lib/repositories/saleRepository';
import { findOrCreateCustomer } from '@/lib/repositories/customerRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
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

  const customer = await findOrCreateCustomer(supabase, {
    full_name: input.customer.fullName,
    phone: input.customer.phone || null,
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
    payment_method_requested: input.paymentMethodRequested || null,
    delivery_full_name: input.customer.fullName,
    delivery_phone: input.customer.phone || null,
    delivery_address: input.customer.address,
    delivery_city: input.customer.city,
    notes: 'Venta creada desde checkout antes de abrir WhatsApp.',
  });

  const saleItems: SaleItemInsert[] = input.items.map((item) => {
    const unitSubtotal = item.originalPrice ?? item.price;
    const lineSubtotal = unitSubtotal * item.quantity;
    const lineTotal = item.price * item.quantity;

    return {
      sale_id: sale.id,
      legacy_product_id: item.legacyProductId,
      product_name_snapshot: item.name,
      unit_price_snapshot: item.price,
      quantity: item.quantity,
      line_subtotal: lineSubtotal,
      line_discount_amount: Math.max(0, lineSubtotal - lineTotal),
      line_total: lineTotal,
      image_url_snapshot: item.imageUrl || null,
    };
  });

  await createSaleItems(supabase, saleItems);

  return {
    persisted: true,
    saleId: sale.id,
    saleNumber: sale.sale_number,
  };
}
