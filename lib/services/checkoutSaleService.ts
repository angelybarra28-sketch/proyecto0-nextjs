import { createCheckoutSaleTransaction } from '@/lib/repositories/saleRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { allProducts } from '@/lib/products';
import type { CheckoutSaleInput, CheckoutSaleResult, CheckoutSaleRpcItem } from '@/lib/supabase/types';

function assertValidCheckoutInput(input: CheckoutSaleInput): void {
  if (!input.checkoutRequestId) {
    throw new Error('Missing checkout request id.');
  }

  for (const item of input.items) {
    const catalogProduct = allProducts.find((product) => product.id === item.legacyProductId);

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Invalid quantity for product ${item.legacyProductId}.`);
    }

    if (!Number.isFinite(item.price) || item.price < 0) {
      throw new Error(`Invalid price for product ${item.legacyProductId}.`);
    }

    if (!catalogProduct) {
      throw new Error(`Product ${item.legacyProductId} no longer exists in the local catalog.`);
    }

    if (catalogProduct.stock < item.quantity) {
      throw new Error(`Insufficient stock for product ${catalogProduct.slug}.`);
    }
  }
}

export async function persistCheckoutSale(input: CheckoutSaleInput): Promise<CheckoutSaleResult> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { persisted: false };
  }

  assertValidCheckoutInput(input);

  const items: CheckoutSaleRpcItem[] = input.items.map((item) => {
    const catalogProduct = allProducts.find((product) => product.id === item.legacyProductId);
    const unitSubtotal = item.originalPrice ?? item.price;
    const lineSubtotal = unitSubtotal * item.quantity;
    const lineTotal = item.price * item.quantity;

    return {
      legacyProductId: item.legacyProductId,
      name: catalogProduct?.name ?? item.name,
      slug: catalogProduct?.slug ?? null,
      category: catalogProduct?.categoria ?? null,
      unitPrice: item.price,
      quantity: item.quantity,
      lineSubtotal,
      lineDiscountAmount: Math.max(0, lineSubtotal - lineTotal),
      lineTotal,
      imageUrl: catalogProduct?.imageUrl ?? item.imageUrl ?? null,
    };
  });

  const sale = await createCheckoutSaleTransaction(supabase, {
    checkoutRequestId: input.checkoutRequestId,
    customer: input.customer,
    paymentMethodRequested: input.paymentMethodRequested,
    items,
  });

  return {
    persisted: sale.persisted,
    saleId: sale.sale_id,
    saleNumber: sale.sale_number,
  };
}
