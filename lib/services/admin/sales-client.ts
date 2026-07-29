import type { AdminSaleListInput, AdminSalesPayload } from '@/lib/services/adminSalesService';
import type { AdminSaleDetail, RegisterPaymentInput, RegisterPaymentResult, SaleItemInsert, SaleStatus } from '@/lib/supabase/types';
import { appendDefinedParam, parseApiError } from './helpers';

export async function fetchAdminSales(input: AdminSaleListInput = {}, signal?: AbortSignal): Promise<AdminSalesPayload> {
  const searchParams = new URLSearchParams();
  appendDefinedParam(searchParams, 'page', input.page);
  appendDefinedParam(searchParams, 'limit', input.limit);
  appendDefinedParam(searchParams, 'search', input.search);
  appendDefinedParam(searchParams, 'saleStatus', input.saleStatus);
  appendDefinedParam(searchParams, 'collectionStatus', input.collectionStatus);
  appendDefinedParam(searchParams, 'dateFrom', input.dateFrom);
  appendDefinedParam(searchParams, 'dateTo', input.dateTo);
  appendDefinedParam(searchParams, 'sortKey', input.sortKey);
  appendDefinedParam(searchParams, 'direction', input.direction);
  const query = searchParams.toString();
  const response = await fetch(`/api/admin/sales${query ? `?${query}` : ''}`, { signal });

  if (!response.ok) {
    throw new Error('No se pudieron cargar las ventas');
  }

  return await response.json() as AdminSalesPayload;
}

export async function fetchAdminSaleDetail(saleId: string, signal?: AbortSignal): Promise<AdminSaleDetail> {
  const response = await fetch(`/api/admin/sales/${saleId}`, { signal });

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
      paymentRequestId: input.paymentRequestId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentDate: input.paymentDate,
      notes: input.notes,
    }),
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo registrar el pago');
  }

  const payload = await response.json() as { payment: RegisterPaymentResult };
  return payload.payment;
}

export type SaleUpdateFields = {
  sale_number?: string;
  delivery_full_name?: string;
  delivery_phone?: string;
  delivery_address?: string;
  delivery_city?: string;
  notes?: string;
  sale_status?: SaleStatus;
  subtotal_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  remaining_amount?: number;
  installments_count?: number;
  item_count?: number;
  items?: SaleItemInsert[];
};

export async function updateAdminSale(saleId: string, fields: SaleUpdateFields): Promise<{ creditAccountId?: string | null }> {
  const response = await fetch(`/api/admin/sales/${saleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });

  if (!response.ok) {
    const payload = await response.json() as { error?: string };
    throw new Error(payload.error ?? 'No se pudo actualizar la venta');
  }

  return await response.json() as { success: boolean; creditAccountId?: string | null };
}
