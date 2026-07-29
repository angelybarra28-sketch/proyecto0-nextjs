import { getSupabaseAdminClient } from '@/lib/supabase/server';
import {
  getCollectionSummary,
  getRecentSales,
  getSaleById,
  getSalesPaginated,
  getSalesWithCustomer,
  refreshFinancialStatuses,
  updateSaleFields,
  replaceSaleItems,
  type AdminSaleFilters,
  type AdminSaleSortKey,
  type SaleUpdateFields,
} from '@/lib/repositories/saleRepository';
import { normalizeText } from '@/lib/validation/common';
import { normalizeSaleStatus, normalizeCollectionStatus } from '@/lib/validation/ventas';
import type { AdminSaleDetail, AdminSaleSummary, CollectionSummary, SaleItemInsert } from '@/lib/supabase/types';
import {
  createPagination,
  normalizeLimit,
  normalizePage,
  type AdminListResponse,
  type AdminSortDirection,
} from '@/lib/services/admin/types';

export type AdminSaleSorting = {
  sortKey: AdminSaleSortKey;
  direction: AdminSortDirection;
};

export type AdminSalesPayload = AdminListResponse<AdminSaleSummary, AdminSaleFilters, AdminSaleSorting> & {
  sales: AdminSaleSummary[];
};

export type AdminSaleListInput = {
  search?: unknown;
  saleStatus?: unknown;
  collectionStatus?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
  sortKey?: unknown;
  direction?: unknown;
  page?: unknown;
  limit?: unknown;
};

function normalizeSaleFilters(input: AdminSaleListInput): AdminSaleFilters {
  return {
    search: normalizeText(input.search),
    saleStatus: normalizeSaleStatus(input.saleStatus),
    collectionStatus: normalizeCollectionStatus(input.collectionStatus),
    dateFrom: normalizeText(input.dateFrom),
    dateTo: normalizeText(input.dateTo),
  };
}

function normalizeSaleSorting(input: AdminSaleListInput): AdminSaleSorting {
  const validSortKeys: AdminSaleSortKey[] = ['saleDate', 'saleNumber', 'customerName', 'total', 'saleStatus', 'collectionStatus'];

  return {
    sortKey: typeof input.sortKey === 'string' && validSortKeys.includes(input.sortKey as AdminSaleSortKey) ? input.sortKey as AdminSaleSortKey : 'saleDate',
    direction: input.direction === 'asc' ? 'asc' : 'desc',
  };
}

export async function listAdminSales(limit = 50): Promise<AdminSaleSummary[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  return getSalesWithCustomer(supabase, limit);
}

export async function listAdminSalesPaginated(input: AdminSaleListInput = {}): Promise<AdminSalesPayload> {
  const supabase = getSupabaseAdminClient();
  const page = normalizePage(input.page);
  const limit = normalizeLimit(input.limit);
  const filters = normalizeSaleFilters(input);
  const sorting = normalizeSaleSorting(input);

  if (!supabase) {
    const pagination = createPagination(page, limit, 0);
    return {
      success: true,
      data: [],
      sales: [],
      pagination,
      filters,
      sorting,
      error: null,
    };
  }

  let result = await getSalesPaginated(supabase, {
    page,
    limit,
    filters,
    sorting,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / limit));
  const resolvedPage = Math.min(page, totalPages);

  if (resolvedPage !== page) {
    result = await getSalesPaginated(supabase, {
      page: resolvedPage,
      limit,
      filters,
      sorting,
    });
  }

  const pagination = createPagination(resolvedPage, limit, result.total);

  return {
    success: true,
    data: result.sales,
    sales: result.sales,
    pagination,
    filters,
    sorting,
    error: null,
  };
}

export async function listRecentAdminSales(limit = 10): Promise<AdminSaleSummary[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  return getRecentSales(supabase, limit);
}

export async function getAdminSaleDetail(saleId: string): Promise<AdminSaleDetail | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  return getSaleById(supabase, saleId);
}

export async function refreshAdminFinancialStatuses(): Promise<void> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  await refreshFinancialStatuses(supabase);
}

export async function getAdminCollectionSummary(): Promise<CollectionSummary> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      totalDebt: 0,
      overdueDebt: 0,
      overdueInstallments: 0,
      overdueSales: 0,
      customersWithDebt: 0,
    };
  }

  return getCollectionSummary(supabase);
}

export async function updateAdminSale(saleId: string, fields: SaleUpdateFields): Promise<void> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  await updateSaleFields(supabase, saleId, fields);
}

export async function replaceAdminSaleItems(saleId: string, items: SaleItemInsert[]): Promise<void> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  await replaceSaleItems(supabase, saleId, items);
}
