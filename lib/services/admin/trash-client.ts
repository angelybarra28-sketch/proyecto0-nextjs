import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { TrashedProductsPayload } from '@/lib/services/admin/trash';
import { parseApiError } from './helpers';

export async function fetchTrashedProducts(signal?: AbortSignal): Promise<TrashedProductsPayload> {
  const response = await fetch('/api/admin/products/trash', { signal });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo cargar la papelera');
  }

  return await response.json() as TrashedProductsPayload;
}

export async function restoreAdminProduct(productId: string): Promise<AdminCatalogProduct> {
  const response = await fetch(`/api/admin/products/${productId}/restore`, {
    method: 'POST',
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo restaurar el producto');
  }

  const payload = await response.json() as { product: AdminCatalogProduct };
  return payload.product;
}

export async function hardDeleteAdminProduct(productId: string): Promise<void> {
  const response = await fetch(`/api/admin/products/${productId}/hard-delete`, {
    method: 'POST',
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo eliminar el producto definitivamente');
  }
}
