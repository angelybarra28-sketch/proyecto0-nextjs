import { getSupabaseAdminClient } from '@/lib/supabase/server';
import {
  getCollectionSummary,
  getRecentSales,
  getSaleById,
  getSalesPaginated,
  getSalesWithCustomer,
  refreshFinancialStatuses,
  type AdminSaleFilters,
  type AdminSaleSortKey,
} from '@/lib/repositories/saleRepository';
import type { AdminSaleDetail, AdminSaleSummary, CollectionStatus, SaleStatus, CollectionSummary } from '@/lib/supabase/types';
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

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSaleStatus(value: unknown): SaleStatus | 'all' {
  return value === 'PENDING' || value === 'CONFIRMED' || value === 'DELIVERED' || value === 'CANCELLED' ? value : 'all';
}

function normalizeCollectionStatus(value: unknown): CollectionStatus | 'all' {
  return value === 'PENDING' || value === 'UP_TO_DATE' || value === 'OVERDUE' || value === 'PAID' ? value : 'all';
}

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

  await refreshFinancialStatuses(supabase);
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

  await refreshFinancialStatuses(supabase);
  const result = await getSalesPaginated(supabase, {
    page,
    limit,
    filters,
    sorting,
  });
  const pagination = createPagination(page, limit, result.total);

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

  await refreshFinancialStatuses(supabase);
  return getRecentSales(supabase, limit);
}

export async function getAdminSaleDetail(saleId: string): Promise<AdminSaleDetail | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  await refreshFinancialStatuses(supabase);
  return getSaleById(supabase, saleId);
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
