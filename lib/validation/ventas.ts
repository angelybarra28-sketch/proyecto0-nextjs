import type { PaymentMethod, SaleStatus, CollectionStatus, CheckoutSaleInput } from '@/lib/supabase/types';
import type { Product } from '@/lib/types';

export const VALID_PAYMENT_METHODS = new Set<PaymentMethod>([
  'CASH',
  'BANK_TRANSFER',
  'MERCADO_PAGO',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'OTHER',
]);

const PAYMENT_DATE_PAST_LIMIT_DAYS = 365 * 5;
const PAYMENT_DATE_FUTURE_LIMIT_DAYS = 7;

export function assertValidPaymentDate(value: string): void {
  const paymentDate = new Date(value);

  if (!value || Number.isNaN(paymentDate.getTime())) {
    throw new Error('Fecha de pago inválida');
  }

  const now = new Date();
  const minDate = new Date(now);
  minDate.setDate(now.getDate() - PAYMENT_DATE_PAST_LIMIT_DAYS);
  const maxDate = new Date(now);
  maxDate.setDate(now.getDate() + PAYMENT_DATE_FUTURE_LIMIT_DAYS);

  if (paymentDate < minDate || paymentDate > maxDate) {
    throw new Error('La fecha de pago está fuera del rango permitido');
  }
}

export function normalizeSaleStatus(value: unknown): SaleStatus | 'all' {
  return value === 'PENDING' || value === 'CONFIRMED' || value === 'DELIVERED' || value === 'CANCELLED' ? value : 'all';
}

export function normalizeCollectionStatus(value: unknown): CollectionStatus | 'all' {
  return value === 'PENDING' || value === 'UP_TO_DATE' || value === 'OVERDUE' || value === 'PAID' ? value : 'all';
}

export function assertValidCheckoutInput(input: CheckoutSaleInput, productsByLegacyId: Map<number, Product>): void {
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

export function isValidCheckoutSaleInput(input: CheckoutSaleInput): boolean {
  return Boolean(
    input.customer?.fullName &&
    input.checkoutRequestId &&
    Array.isArray(input.items) &&
    input.items.length > 0
  );
}
