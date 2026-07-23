import type { AdminDashboardStats, AdminSaleDetail, CollectionSummary, RegisterPaymentInput, RegisterPaymentResult, SaleItemInsert, SaleStatus, ProveedorRow, ProveedorInsert, ProveedorCompraRow, ProveedorCompraInsert, ProveedorCompraItemRow, ProveedorCompraItemInsert, ProveedorPagoRow, ProveedorPagoInsert, ProveedorAdjuntoRow, ProveedorAdjuntoInsert, ProveedorDashboard, ProveedorDeuda, ProveedorAlerta } from '@/lib/supabase/types';
import type { AdminCatalogPayload, AdminProductListInput, AdminProductPayload } from '@/lib/services/adminCatalogService';
import type { AdminSaleListInput, AdminSalesPayload } from '@/lib/services/adminSalesService';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { AdminUserView } from '@/lib/types';

export type UploadedProductImage = {
  path: string;
  url: string;
};

function appendDefinedParam(searchParams: URLSearchParams, key: string, value: unknown) {
  if (value !== undefined && value !== null && value !== '') {
    searchParams.set(key, String(value));
  }
}

async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return payload?.error?.message ?? payload?.message ?? '';
  } catch {
    return '';
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

export async function fetchAdminCategories(signal?: AbortSignal): Promise<import('@/lib/services/adminCategoryService').AdminCategoryPayload> {
  const response = await fetch('/api/admin/categories', { signal });

  if (!response.ok) {
    throw new Error('No se pudieron cargar las categorías');
  }

  return await response.json() as import('@/lib/services/adminCategoryService').AdminCategoryPayload;
}

export async function createAdminCategory(input: {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<import('@/lib/services/adminCategoryService').AdminCategoryItem> {
  const response = await fetch('/api/admin/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response.json() as { error?: { message?: string } };
    throw new Error(payload?.error?.message || 'No se pudo crear la categoría');
  }

  const payload = await response.json() as { category: import('@/lib/services/adminCategoryService').AdminCategoryItem };
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
): Promise<import('@/lib/services/adminCategoryService').AdminCategoryItem> {
  const response = await fetch(`/api/admin/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response.json() as { error?: { message?: string } };
    throw new Error(payload?.error?.message || 'No se pudo actualizar la categoría');
  }

  const payload = await response.json() as { category: import('@/lib/services/adminCategoryService').AdminCategoryItem };
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

export async function fetchAdminUsers(signal?: AbortSignal, options?: { page?: number; limit?: number }): Promise<AdminUserView[]> {
  const searchParams = new URLSearchParams();
  if (options?.page !== undefined && options.page !== null) {
    searchParams.set('page', String(options.page));
  }
  if (options?.limit !== undefined && options.limit !== null) {
    searchParams.set('limit', String(options.limit));
  }
  const query = searchParams.toString();
  const response = await fetch(`/api/admin/users${query ? `?${query}` : ''}`, { signal });

  if (!response.ok) {
    throw new Error('No se pudieron cargar los usuarios');
  }

  const payload = await response.json() as { users: AdminUserView[] };
  return payload.users;
}

export async function toggleAdminUser(userId: string, isActive: boolean, signal?: AbortSignal): Promise<{ previousIsActive: boolean; newIsActive: boolean }> {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isActive }),
  });

  if (!response.ok) {
    const payload = await response.json() as { error?: { message?: string }; message?: string };
    throw new Error(payload.error?.message ?? payload.message ?? 'No se pudo registrar el pago');
  }

  const payload = await response.json() as { previousIsActive: boolean; newIsActive: boolean };
  return payload;
}

export async function fetchCreditAccounts(
  signal?: AbortSignal,
  options?: { search?: string; statusFilter?: 'active' | 'finished' | 'all'; page?: number; pageSize?: number }
): Promise<{ accounts: import('@/lib/types').CreditAccountSummary[]; dashboard: import('@/lib/types').CreditDashboard | null; totalCount?: number; page?: number; pageSize?: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('dashboard', 'true');
  if (options?.search) searchParams.set('search', options.search);
  if (options?.statusFilter) searchParams.set('statusFilter', options.statusFilter);
  if (options?.page) searchParams.set('page', String(options.page));
  if (options?.pageSize) searchParams.set('pageSize', String(options.pageSize));
  const response = await fetch(`/api/admin/credit-accounts?${searchParams.toString()}`, { signal });

  if (!response.ok) {
    throw new Error('No se pudieron cargar las cuentas corrientes');
  }

  return await response.json() as { accounts: import('@/lib/types').CreditAccountSummary[]; dashboard: import('@/lib/types').CreditDashboard | null; totalCount?: number; page?: number; pageSize?: number };
}

export async function createCreditAccount(
  input: Omit<import('@/lib/types').CreateCreditAccountInput, 'saleDate'> & { saleDate?: string }
): Promise<import('@/lib/types').CreditAccountSummary> {
  const response = await fetch('/api/admin/credit-accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo registrar el pago');
  }

  const payload = await response.json() as { account: import('@/lib/types').CreditAccountSummary };
  return payload.account;
}

export async function fetchCreditAccountDetail(accountId: string, signal?: AbortSignal): Promise<import('@/lib/types').CreditAccountDetail> {
  const response = await fetch(`/api/admin/credit-accounts/${accountId}`, { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar el detalle de la cuenta corriente');
  }

  const payload = await response.json() as { account: import('@/lib/types').CreditAccountDetail };
  return payload.account;
}

export async function registerCreditPayment(
  accountId: string,
  input: { amount: number; paymentMethod?: string; paymentDate?: string; notes?: string }
): Promise<import('@/lib/types').CreditAccountDetail> {
  const response = await fetch(`/api/admin/credit-accounts/${accountId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo registrar el pago');
  }

  const payload = await response.json() as { account: import('@/lib/types').CreditAccountDetail };
  return payload.account;
}

export async function addCreditCollectionNote(
  accountId: string,
  input: {
    contactType: 'CALL' | 'WHATSAPP' | 'VISIT' | 'OTHER';
    result: 'NOTE' | 'PROMISE' | 'NO_CONTACT' | 'PARTIAL_PAYMENT' | 'PAID' | 'OTHER';
    notes: string;
    createdBy: string;
  }
): Promise<import('@/lib/types').CreditCollectionNote> {
  const response = await fetch(`/api/admin/credit-accounts/${accountId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo guardar la gestion');
  }

  const payload = await response.json() as { note: import('@/lib/types').CreditCollectionNote };
  return payload.note;
}

export async function fetchCreditCollectionRoute(signal?: AbortSignal): Promise<import('@/lib/types').CollectionRouteItem[]> {
  const response = await fetch('/api/admin/credit-accounts/overdue', { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar la ruta de cobranza');
  }

  const payload = await response.json() as { route: import('@/lib/types').CollectionRouteItem[] };
  return payload.route;
}

export async function previewPortfolioImport(formData: FormData): Promise<import('@/lib/types').ImportPortfolioPreview> {
  const response = await fetch('/api/admin/importacion-cartera/preview', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo generar el preview');
  }

  const payload = await response.json() as { preview: import('@/lib/types').ImportPortfolioPreview };
  return payload.preview;
}

export async function executePortfolioImport(rows: import('@/lib/types').ImportPortfolioRow[]): Promise<import('@/lib/types').ImportPortfolioResult> {
  const response = await fetch('/api/admin/importacion-cartera/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rows }),
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo importar la cartera');
  }

  const payload = await response.json() as { result: import('@/lib/types').ImportPortfolioResult };
  return payload.result;
}

export async function fetchCleanSummary(signal?: AbortSignal): Promise<{
  allocationCount: number;
  paymentCount: number;
  installmentCount: number;
  accountCount: number;
  customerCount: number;
}> {
  const response = await fetch('/api/admin/credit-accounts/clean-summary', { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar el resumen de limpieza');
  }

  return await response.json() as {
    allocationCount: number;
    paymentCount: number;
    installmentCount: number;
    accountCount: number;
    customerCount: number;
  };
}

export async function cleanCreditPortfolio(): Promise<{
  allocationsDeleted: number;
  paymentsDeleted: number;
  installmentsDeleted: number;
  accountsDeleted: number;
  customersDeleted: number;
  timestamp: string;
}> {
  const response = await fetch('/api/admin/credit-accounts/clean', {
    method: 'POST',
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo ejecutar la limpieza');
  }

  return await response.json() as {
    allocationsDeleted: number;
    paymentsDeleted: number;
    installmentsDeleted: number;
    accountsDeleted: number;
    customersDeleted: number;
    timestamp: string;
  };
}

export async function fetchCommercialMetrics(signal?: AbortSignal): Promise<{
  currentMonthlyCollection: number;
  monthlyReplacement: number;
  replacementCount: number;
  finishedCards: number;
  finishedInstallmentsAmount: number;
  projectedNextMonth: number;
  finishedAccountsList: import('@/lib/types').CreditAccountSummary[];
}> {
  const response = await fetch('/api/admin/credit-accounts/commercial-metrics', { signal });

  if (!response.ok) {
    throw new Error('No se pudieron cargar las métricas comerciales');
  }

  return await response.json() as {
    currentMonthlyCollection: number;
    monthlyReplacement: number;
    replacementCount: number;
    finishedCards: number;
    finishedInstallmentsAmount: number;
    projectedNextMonth: number;
    finishedAccountsList: import('@/lib/types').CreditAccountSummary[];
  };
}

export async function fetchControlMensual(signal?: AbortSignal): Promise<{
  rows: {
    customerName: string;
    operationNumber: string;
    productName: string;
    installmentAmount: number;
    status: string;
    saleDate: string;
    lastPaymentDate: string | null;
    remainingAmount: number;
    originMonth: number | null;
    originYear: number | null;
  }[];
  summary: {
    monthlyReplacement: number;
    finishedCards: number;
    currentMonthlyCollection: number;
    projectedNextMonth: number;
  };
}> {
  const response = await fetch('/api/admin/credit-accounts/control-mensual', { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar el control mensual');
  }

  return await response.json() as {
    rows: {
      customerName: string;
      operationNumber: string;
      productName: string;
      installmentAmount: number;
      status: string;
      saleDate: string;
      lastPaymentDate: string | null;
      remainingAmount: number;
      originMonth: number | null;
      originYear: number | null;
    }[];
    summary: {
      monthlyReplacement: number;
      finishedCards: number;
      currentMonthlyCollection: number;
      projectedNextMonth: number;
    };
  };
}

// --- Proveedores ---

export async function fetchProveedores(params?: { estado?: string; search?: string }, signal?: AbortSignal): Promise<ProveedorRow[]> {
  const searchParams = new URLSearchParams();
  if (params?.estado) appendDefinedParam(searchParams, 'estado', params.estado);
  if (params?.search) appendDefinedParam(searchParams, 'search', params.search);
  const query = searchParams.toString();
  const response = await fetch(`/api/admin/proveedores${query ? `?${query}` : ''}`, { signal });
  if (!response.ok) throw new Error('No se pudieron cargar los proveedores');
  const payload = await response.json() as { proveedores: ProveedorRow[] };
  return payload.proveedores;
}

export async function createProveedor(input: ProveedorInsert): Promise<ProveedorRow> {
  const response = await fetch('/api/admin/proveedores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('No se pudo crear el proveedor');
  const payload = await response.json() as { proveedor: ProveedorRow };
  return payload.proveedor;
}

export async function updateProveedor(id: string, input: Partial<ProveedorInsert>): Promise<ProveedorRow> {
  const response = await fetch(`/api/admin/proveedores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('No se pudo actualizar el proveedor');
  const payload = await response.json() as { proveedor: ProveedorRow };
  return payload.proveedor;
}

export async function fetchCompras(params?: { proveedor_id?: string; estado?: string; date_from?: string; date_to?: string }, signal?: AbortSignal): Promise<ProveedorCompraRow[]> {
  const searchParams = new URLSearchParams();
  if (params?.proveedor_id) appendDefinedParam(searchParams, 'proveedor_id', params.proveedor_id);
  if (params?.estado) appendDefinedParam(searchParams, 'estado', params.estado);
  if (params?.date_from) appendDefinedParam(searchParams, 'date_from', params.date_from);
  if (params?.date_to) appendDefinedParam(searchParams, 'date_to', params.date_to);
  const query = searchParams.toString();
  const response = await fetch(`/api/admin/proveedores/compras${query ? `?${query}` : ''}`, { signal });
  if (!response.ok) throw new Error('No se pudieron cargar las compras');
  const payload = await response.json() as { compras: ProveedorCompraRow[] };
  return payload.compras;
}

export async function fetchCompraDetail(id: string, signal?: AbortSignal): Promise<{ compra: ProveedorCompraRow; items: ProveedorCompraItemRow[]; pagos: ProveedorPagoRow[]; adjuntos: ProveedorAdjuntoRow[] }> {
  const response = await fetch(`/api/admin/proveedores/compras/${id}`, { signal });
  if (!response.ok) throw new Error('No se pudo cargar la compra');
  const payload = await response.json() as { compra: ProveedorCompraRow; items: ProveedorCompraItemRow[]; pagos: ProveedorPagoRow[]; adjuntos: ProveedorAdjuntoRow[] };
  return payload;
}

export async function createCompra(input: ProveedorCompraInsert): Promise<ProveedorCompraRow> {
  const response = await fetch('/api/admin/proveedores/compras', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('No se pudo crear la compra');
  const payload = await response.json() as { compra: ProveedorCompraRow };
  return payload.compra;
}

export async function updateCompra(id: string, input: Partial<ProveedorCompraInsert>): Promise<ProveedorCompraRow> {
  const response = await fetch(`/api/admin/proveedores/compras/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('No se pudo actualizar la compra');
  const payload = await response.json() as { compra: ProveedorCompraRow };
  return payload.compra;
}

export async function createCompraItems(items: ProveedorCompraItemInsert[]): Promise<ProveedorCompraItemRow[]> {
  const response = await fetch('/api/admin/proveedores/compras/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error('No se pudieron guardar los items');
  const payload = await response.json() as { items: ProveedorCompraItemRow[] };
  return payload.items;
}

export async function deleteCompraItem(id: string): Promise<void> {
  const response = await fetch(`/api/admin/proveedores/compras/items/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('No se pudo eliminar el item');
}

export async function fetchPagos(params?: { proveedor_id?: string }, signal?: AbortSignal): Promise<ProveedorPagoRow[]> {
  const searchParams = new URLSearchParams();
  if (params?.proveedor_id) appendDefinedParam(searchParams, 'proveedor_id', params.proveedor_id);
  const query = searchParams.toString();
  const response = await fetch(`/api/admin/proveedores/pagos${query ? `?${query}` : ''}`, { signal });
  if (!response.ok) throw new Error('No se pudieron cargar los pagos');
  const payload = await response.json() as { pagos: ProveedorPagoRow[] };
  return payload.pagos;
}

export async function createPago(input: ProveedorPagoInsert): Promise<ProveedorPagoRow> {
  const response = await fetch('/api/admin/proveedores/pagos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('No se pudo registrar el pago');
  const payload = await response.json() as { pago: ProveedorPagoRow };
  return payload.pago;
}

export async function deleteCompra(id: string): Promise<void> {
  const response = await fetch(`/api/admin/proveedores/compras/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('No se pudo eliminar la compra');
}

export async function deletePago(id: string): Promise<void> {
  const response = await fetch(`/api/admin/proveedores/pagos/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('No se pudo eliminar el pago');
}

export async function uploadProveedorAdjunto(compraId: string, file: File, tipo: string, pagoId?: string): Promise<ProveedorAdjuntoRow> {
  const formData = new FormData();
  formData.append('file', file);
  if (compraId) formData.append('compra_id', compraId);
  if (pagoId) formData.append('pago_id', pagoId);
  formData.append('tipo', tipo);
  const response = await fetch('/api/admin/proveedores/adjuntos', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('No se pudo subir el archivo');
  const payload = await response.json() as { adjunto: ProveedorAdjuntoRow };
  return payload.adjunto;
}

export async function deleteProveedorAdjunto(id: string): Promise<void> {
  const response = await fetch(`/api/admin/proveedores/adjuntos/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('No se pudo eliminar el archivo');
}

export async function fetchProveedorDashboard(signal?: AbortSignal): Promise<ProveedorDashboard> {
  const response = await fetch('/api/admin/proveedores/dashboard', { signal });
  if (!response.ok) throw new Error('No se pudo cargar el dashboard');
  const payload = await response.json() as { dashboard: ProveedorDashboard };
  return payload.dashboard;
}

export async function fetchDeudas(signal?: AbortSignal): Promise<ProveedorDeuda[]> {
  const response = await fetch('/api/admin/proveedores/deudas', { signal });
  if (!response.ok) throw new Error('No se pudieron cargar las deudas');
  const payload = await response.json() as { deudas: ProveedorDeuda[] };
  return payload.deudas;
}

export async function fetchProveedorAlertas(signal?: AbortSignal): Promise<ProveedorAlerta[]> {
  const response = await fetch('/api/admin/proveedores/alertas', { signal });
  if (!response.ok) throw new Error('No se pudieron cargar las alertas');
  const payload = await response.json() as { alertas: ProveedorAlerta[] };
  return payload.alertas;
}

export async function fetchEstadisticasCompras(signal?: AbortSignal): Promise<{ compras_por_mes: { mes: string; total: number }[]; compras_por_proveedor: { proveedor: string; total: number }[]; evolucion_gasto: { mes: string; total: number; acumulado: number }[] }> {
  const response = await fetch('/api/admin/proveedores/estadisticas', { signal });
  if (!response.ok) throw new Error('No se pudieron cargar las estadísticas');
  const payload = await response.json();
  return payload;
}
