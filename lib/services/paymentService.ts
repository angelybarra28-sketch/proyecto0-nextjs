import { registerSalePayment } from '@/lib/repositories/paymentRepository';
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

export async function registerAdminPayment(
  input: RegisterPaymentInput
): Promise<RegisterPaymentResult> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('El monto del pago debe ser mayor a cero');
  }

  if (!VALID_PAYMENT_METHODS.has(input.paymentMethod)) {
    throw new Error('Método de pago inválido');
  }

  if (!input.paymentDate || Number.isNaN(new Date(input.paymentDate).getTime())) {
    throw new Error('Fecha de pago inválida');
  }

  return registerSalePayment(supabase, input);
}
