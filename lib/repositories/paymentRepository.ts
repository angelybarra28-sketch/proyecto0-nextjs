import type { SupabaseClient } from '@supabase/supabase-js';
import type { RegisterPaymentInput, RegisterPaymentResult } from '@/lib/supabase/types';

interface RegisterPaymentRpcRow {
  payment_id: string;
  total_allocated: number | string;
  sale_paid_amount: number | string;
  sale_remaining_amount: number | string;
  collection_status: RegisterPaymentResult['collectionStatus'];
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

export async function registerSalePayment(
  supabase: SupabaseClient,
  input: RegisterPaymentInput
): Promise<RegisterPaymentResult> {
  const { data, error } = await supabase
    .rpc('register_sale_payment', {
      p_sale_id: input.saleId,
      p_payment_request_id: input.paymentRequestId,
      p_amount: input.amount,
      p_payment_method: input.paymentMethod,
      p_payment_date: input.paymentDate,
      p_notes: input.notes ?? null,
    })
    .single();

  if (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as Record<string, unknown>).message)
        : 'Error desconocido de Supabase';
    throw new Error(message, { cause: error });
  }

  const row = data as RegisterPaymentRpcRow;

  return {
    paymentId: row.payment_id,
    totalAllocated: toNumber(row.total_allocated),
    salePaidAmount: toNumber(row.sale_paid_amount),
    saleRemainingAmount: toNumber(row.sale_remaining_amount),
    collectionStatus: row.collection_status,
  };
}
