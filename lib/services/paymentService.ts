import { VALID_PAYMENT_METHODS, assertValidPaymentDate } from '@/lib/validation/ventas';
import { registerSalePayment } from '@/lib/repositories/paymentRepository';
import { assertRuntimeContract } from '@/lib/services/runtimeContractService';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { RegisterPaymentInput, RegisterPaymentResult } from '@/lib/supabase/types';

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
