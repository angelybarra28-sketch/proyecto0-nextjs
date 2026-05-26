import { registerSalePayment } from '@/lib/repositories/paymentRepository';
import { assertRuntimeContract } from '@/lib/services/runtimeContractService';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { PaymentMethod, RegisterPaymentInput, RegisterPaymentResult } from '@/lib/supabase/types';

const VALID_PAYMENT_METHODS = new Set<PaymentMethod>([
  'CASH',
  'BANK_TRANSFER',
  'MERCADO_PAGO',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'OTHER',
]);

const PAYMENT_DATE_PAST_LIMIT_DAYS = 365 * 5;
const PAYMENT_DATE_FUTURE_LIMIT_DAYS = 7;

function assertValidPaymentDate(value: string): void {
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

export async function registerAdminPayment(
  input: RegisterPaymentInput
): Promise<RegisterPaymentResult> {
  await assertRuntimeContract('admin payments');

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('El monto del pago debe ser mayor a cero');
  }

  if (!input.paymentRequestId || typeof input.paymentRequestId !== 'string' || input.paymentRequestId.length > 120) {
    throw new Error('Identificador de pago inválido');
  }

  if (!VALID_PAYMENT_METHODS.has(input.paymentMethod)) {
    throw new Error('Método de pago inválido');
  }

  assertValidPaymentDate(input.paymentDate);

  return registerSalePayment(supabase, input);
}
