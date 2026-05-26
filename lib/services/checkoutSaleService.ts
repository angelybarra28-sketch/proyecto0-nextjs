import { createCheckoutSaleTransaction } from '@/lib/repositories/saleRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { getProducts } from '@/lib/services/catalogService';
import type { Product } from '@/lib/types';
import type { CheckoutSaleInput, CheckoutSaleResult, CheckoutSaleRpcItem } from '@/lib/supabase/types';

function assertValidCheckoutInput(input: CheckoutSaleInput, productsByLegacyId: Map<number, Product>): void {
  if (!input.checkoutRequestId) {
    throw new Error('Missing checkout request id.');
  }

  for (const item of input.items) {
    if (!Number.isInteger(item.legacyProductId) || item.legacyProductId <= 0) {
      throw new Error('Product must have a valid legacy product id while hybrid catalog mode is enabled.');
    }

    const catalogProduct = productsByLegacyId.get(item.legacyProductId);

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Invalid quantity for product ${item.legacyProductId}.`);
    }

    if (!Number.isFinite(item.price) || item.price < 0) {
      throw new Error(`Invalid price for product ${item.legacyProductId}.`);
    }

    if (!catalogProduct) {
      throw new Error(`Product ${item.legacyProductId} no longer exists in the local catalog.`);
    }

    if (!Number.isInteger(catalogProduct.id) || catalogProduct.id <= 0) {
      throw new Error(`Product ${catalogProduct.slug} is missing a stable legacy product id.`);
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

  const productsByLegacyId = new Map(
    (await getProducts())
      .filter((product) => product.id > 0)
      .map((product) => [product.id, product])
  );

  assertValidCheckoutInput(input, productsByLegacyId);

  const items: CheckoutSaleRpcItem[] = input.items.map((item) => {
    const catalogProduct = productsByLegacyId.get(item.legacyProductId);
    if (!catalogProduct) {
      throw new Error(`Product ${item.legacyProductId} no longer exists in the catalog.`);
    }

    // Hybrid mode still persists legacy ids, but financial amounts are always server-priced.
    const unitPrice = catalogProduct.priceNumber;
    const unitSubtotal = unitPrice;
    const lineSubtotal = unitSubtotal * item.quantity;
    const lineTotal = unitPrice * item.quantity;

    return {
      legacyProductId: item.legacyProductId,
      name: catalogProduct.name,
      slug: catalogProduct.slug,
      category: catalogProduct.categoria,
      unitPrice,
      quantity: item.quantity,
      lineSubtotal,
      lineDiscountAmount: Math.max(0, lineSubtotal - lineTotal),
      lineTotal,
      imageUrl: catalogProduct.imageUrl ?? item.imageUrl ?? null,
    };
  });

  const sale = await createCheckoutSaleTransaction(supabase, {
    checkoutRequestId: input.checkoutRequestId,
    customer: input.customer,
    paymentMethodRequested: input.paymentMethodRequested,
    paymentPlanType: input.paymentPlanType ?? 'FULL_PAYMENT',
    installmentsCount: input.installmentsCount ?? 1,
    firstDueDate: input.firstDueDate,
    items,
  });

  return {
    persisted: sale.persisted,
    saleId: sale.sale_id,
    saleNumber: sale.sale_number,
  };
}
