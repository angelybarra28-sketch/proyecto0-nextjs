import type { AdminDashboardStats, AdminSaleDetail, CollectionSummary, RegisterPaymentInput, RegisterPaymentResult } from '@/lib/supabase/types';
import type { AdminCatalogPayload, AdminProductListInput, AdminProductPayload } from '@/lib/services/adminCatalogService';
import type { AdminSaleListInput, AdminSalesPayload } from '@/lib/services/adminSalesService';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';

export type UploadedProductImage = {
  path: string;
  url: string;
};

function appendDefinedParam(searchParams: URLSearchParams, key: string, value: unknown) {
  if (value !== undefined && value !== null && value !== '') {
    searchParams.set(key, String(value));
  }
}

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

export async function fetchCollectionSummary(signal?: AbortSignal): Promise<CollectionSummary> {
  const response = await fetch('/api/admin/collections/summary', { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar el resumen de cobranza');
  }

  const payload = await response.json() as { summary: CollectionSummary | null };

  if (!payload.summary) {
    throw new Error('Resumen de cobranza no disponible');
  }

  return payload.summary;
}

export async function fetchAdminDashboard(signal?: AbortSignal): Promise<AdminDashboardStats> {
  const response = await fetch('/api/admin/dashboard', { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar el dashboard');
  }

  const payload = await response.json() as { dashboard: AdminDashboardStats | null };

  if (!payload.dashboard) {
    throw new Error('Dashboard no disponible');
  }

  return payload.dashboard;
}

export async function fetchAdminProducts(input: AdminProductListInput = {}, signal?: AbortSignal): Promise<AdminCatalogPayload> {
  const searchParams = new URLSearchParams();
  appendDefinedParam(searchParams, 'page', input.page);
  appendDefinedParam(searchParams, 'limit', input.limit);
  appendDefinedParam(searchParams, 'search', input.search);
  appendDefinedParam(searchParams, 'status', input.status);
  appendDefinedParam(searchParams, 'featured', input.featured);
  appendDefinedParam(searchParams, 'categoryId', input.categoryId);
  appendDefinedParam(searchParams, 'sortKey', input.sortKey);
  appendDefinedParam(searchParams, 'direction', input.direction);
  const query = searchParams.toString();
  const response = await fetch(`/api/admin/products${query ? `?${query}` : ''}`, { signal });

  if (!response.ok) {
    throw new Error('No se pudieron cargar los productos');
  }

  return await response.json() as AdminCatalogPayload;
}

export async function updateAdminProduct(
  productId: string,
  input: Partial<AdminProductPayload>
): Promise<AdminCatalogProduct> {
  const response = await fetch(`/api/admin/products/${productId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo actualizar el producto');
  }

  const payload = await response.json() as { product: AdminCatalogProduct };
  return payload.product;
}

export async function uploadAdminProductImage(
  productId: string,
  file: File
): Promise<UploadedProductImage> {
  const formData = new FormData();
  formData.append('productId', productId);
  formData.append('file', file);

  const response = await fetch('/api/admin/products/images', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo subir la imagen');
  }

  const payload = await response.json() as { image: UploadedProductImage };
  return payload.image;
}

export async function deleteAdminProductImage(url: string): Promise<boolean> {
  const response = await fetch('/api/admin/products/images', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo eliminar la imagen');
  }

  const payload = await response.json() as { deleted: boolean };
  return payload.deleted;
}
