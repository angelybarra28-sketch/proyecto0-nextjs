export type AdminSortDirection = 'asc' | 'desc';

export type AdminPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminListResponse<TData, TFilters, TSorting> = {
  success: boolean;
  data: TData[];
  pagination: AdminPagination;
  filters: TFilters;
  sorting: TSorting;
  error: string | null;
};

export function normalizePage(value: unknown): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function normalizeLimit(value: unknown, defaultLimit = 10, maxLimit = 100): number {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    return defaultLimit;
  }

  return Math.min(limit, maxLimit);
}

export function createPagination(page: number, limit: number, total: number): AdminPagination {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function getPaginationRange(page: number, limit: number): { from: number; to: number } {
  const from = (page - 1) * limit;

  return {
    from,
    to: from + limit - 1,
  };
}
