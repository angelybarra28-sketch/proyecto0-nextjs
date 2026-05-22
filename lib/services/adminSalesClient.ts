import type { AdminSaleDetail, AdminSaleSummary, CollectionSummary, RegisterPaymentInput, RegisterPaymentResult } from '@/lib/supabase/types';

export async function fetchAdminSales(): Promise<AdminSaleSummary[]> {
  const response = await fetch('/api/admin/sales');

  if (!response.ok) {
    throw new Error('No se pudieron cargar las ventas');
  }

  const payload = await response.json() as { sales: AdminSaleSummary[] };
  return payload.sales;
}

export async function fetchAdminSaleDetail(saleId: string): Promise<AdminSaleDetail> {
  const response = await fetch(`/api/admin/sales/${saleId}`);

  if (!response.ok) {
    throw new Error('No se pudo cargar el detalle de la venta');
  }

  const payload = await response.json() as { sale: AdminSaleDetail | null };

  if (!payload.sale) {
    throw new Error('Venta no encontrada');
  }

  return payload.sale;
}

export async function registerAdminSalePayment(
  input: RegisterPaymentInput
): Promise<RegisterPaymentResult> {
  const response = await fetch(`/api/admin/sales/${input.saleId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentDate: input.paymentDate,
      notes: input.notes,
    }),
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo registrar el pago');
  }

  const payload = await response.json() as { payment: RegisterPaymentResult };
  return payload.payment;
}

export async function fetchCollectionSummary(): Promise<CollectionSummary> {
  const response = await fetch('/api/admin/collections/summary');

  if (!response.ok) {
    throw new Error('No se pudo cargar el resumen de cobranza');
  }

  const payload = await response.json() as { summary: CollectionSummary | null };

  if (!payload.summary) {
    throw new Error('Resumen de cobranza no disponible');
  }

  return payload.summary;
}
