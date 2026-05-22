import { registerSalePayment } from '@/lib/repositories/paymentRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { RegisterPaymentInput, RegisterPaymentResult } from '@/lib/supabase/types';

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

  return registerSalePayment(supabase, input);
}
