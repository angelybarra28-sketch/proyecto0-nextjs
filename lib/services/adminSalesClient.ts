import type { AdminSaleDetail, AdminSaleSummary } from '@/lib/supabase/types';

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
