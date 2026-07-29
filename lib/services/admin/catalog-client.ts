import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { AdminCatalogPayload, AdminProductListInput, AdminProductPayload } from '@/lib/services/adminCatalogService';
import type { AdminCategoryItem, AdminCategoryPayload } from '@/lib/services/adminCategoryService';
import { appendDefinedParam, parseApiError } from './helpers';

export type UploadedProductImage = {
  path: string;
  url: string;
};

// --- Products ---

export async function fetchAdminProducts(input: AdminProductListInput = {}, signal?: AbortSignal): Promise<AdminCatalogPayload> {
  const searchParams = new URLSearchParams();
  appendDefinedParam(searchParams, 'page', input.page);
  appendDefinedParam(searchParams, 'limit', input.limit);
  appendDefinedParam(searchParams, 'search', input.search);
  appendDefinedParam(searchParams, 'status', input.status);
  appendDefinedParam(searchParams, 'featured', input.featured);
  appendDefinedParam(searchParams, 'categoryId', input.categoryId);
  appendDefinedParam(searchParams, 'size', input.size);
  appendDefinedParam(searchParams, 'sortKey', input.sortKey);
  appendDefinedParam(searchParams, 'direction', input.direction);
  const query = searchParams.toString();
  const response = await fetch(`/api/admin/products${query ? `?${query}` : ''}`, { signal });

  if (!response.ok) {
    throw new Error('No se pudieron cargar los productos');
  }

  return await response.json() as AdminCatalogPayload;
}

export async function createAdminProduct(
  input: AdminProductPayload
): Promise<AdminCatalogProduct> {
  const response = await fetch('/api/admin/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo crear el producto');
  }

  const payload = await response.json() as { product: AdminCatalogProduct };
  return payload.product;
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
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo actualizar el producto');
  }

  const payload = await response.json() as { product: AdminCatalogProduct };
  return payload.product;
}

export async function deleteAdminProduct(productId: string): Promise<void> {
  const response = await fetch(`/api/admin/products/${productId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo eliminar el producto');
  }
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
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo subir la imagen');
  }

  const payload = await response.json() as { image: UploadedProductImage };
  return payload.image;
}

export async function deleteAdminProductImage(url: string, productId?: string): Promise<boolean> {
  const response = await fetch('/api/admin/products/images', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productId, url }),
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo eliminar la imagen');
  }

  const payload = await response.json() as { deleted: boolean };
  return payload.deleted;
}

// --- Categories ---

export async function fetchAdminCategories(signal?: AbortSignal): Promise<AdminCategoryPayload> {
  const response = await fetch('/api/admin/categories', { signal });

  if (!response.ok) {
    throw new Error('No se pudieron cargar las categorías');
  }

  return await response.json() as AdminCategoryPayload;
}

export async function createAdminCategory(input: {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<AdminCategoryItem> {
  const response = await fetch('/api/admin/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response.json() as { error?: { message?: string } };
    throw new Error(payload?.error?.message || 'No se pudo crear la categoría');
  }

  const payload = await response.json() as { category: AdminCategoryItem };
  return payload.category;
}

export async function updateAdminCategory(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string | null;
    parentId?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }
): Promise<AdminCategoryItem> {
  const response = await fetch(`/api/admin/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response.json() as { error?: { message?: string } };
    throw new Error(payload?.error?.message || 'No se pudo actualizar la categoría');
  }

  const payload = await response.json() as { category: AdminCategoryItem };
  return payload.category;
}

export async function deleteAdminCategory(id: string): Promise<void> {
  const response = await fetch(`/api/admin/categories/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const payload = await response.json() as { error?: { message?: string } };
    throw new Error(payload?.error?.message || 'No se pudo eliminar la categoría');
  }
}
