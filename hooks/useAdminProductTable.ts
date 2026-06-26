'use client';

import { useMemo, useState } from 'react';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { AdminPagination } from '@/lib/services/admin/types';
import type { AdminProductFilters, AdminProductListInput, AdminProductSorting } from '@/lib/services/adminCatalogService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export type AdminProductSizeFilter = AdminProductFilters['size'];

export type AdminProductFeaturedFilter = AdminProductFilters['featured'];
export type AdminProductStatusFilter = AdminProductFilters['status'];
export type AdminProductSortKey = AdminProductSorting['sortKey'];
export type AdminProductSortDirection = AdminProductSorting['direction'];

const DEFAULT_PAGE_SIZE = 10;

export function useAdminProductTable(pagination: AdminPagination | null) {
  const [search, setSearchValue] = useState('');
  const [statusFilter, setStatusFilterValue] = useState<AdminProductStatusFilter>('all');
  const [featuredFilter, setFeaturedFilterValue] = useState<AdminProductFeaturedFilter>('all');
  const [categoryId, setCategoryIdValue] = useState('');
  const [size, setSizeValue] = useState<AdminProductSizeFilter>('');
  const [sortKey, setSortKeyValue] = useState<AdminProductSortKey>('createdAt');
  const [sortDirection, setSortDirectionValue] = useState<AdminProductSortDirection>('desc');
  const [page, setPageValue] = useState(1);
  const [pageSize, setPageSizeValue] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search);

  const query = useMemo<AdminProductListInput>(() => ({
    page,
    limit: pageSize,
    search: debouncedSearch,
    status: statusFilter,
    featured: featuredFilter,
    categoryId,
    size,
    sortKey,
    direction: sortDirection,
  }), [categoryId, debouncedSearch, featuredFilter, page, pageSize, size, sortDirection, sortKey, statusFilter]);

  const setSearch = (value: string) => {
    setSearchValue(value);
    setPageValue(1);
  };

  const setStatusFilter = (value: AdminProductStatusFilter) => {
    setStatusFilterValue(value);
    setPageValue(1);
  };

  const setFeaturedFilter = (value: AdminProductFeaturedFilter) => {
    setFeaturedFilterValue(value);
    setPageValue(1);
  };

  const setCategoryId = (value: string) => {
    setCategoryIdValue(value);
    setPageValue(1);
  };

  const setSize = (value: AdminProductSizeFilter) => {
    setSizeValue(value);
    setPageValue(1);
  };

  const setSortKey = (value: AdminProductSortKey) => {
    setSortKeyValue(value);
    setPageValue(1);
  };

  const setSortDirection = (value: AdminProductSortDirection) => {
    setSortDirectionValue(value);
    setPageValue(1);
  };

  const setPageSize = (value: number) => {
    setPageSizeValue(value);
    setPageValue(1);
  };

  return {
    query,
    search,
    statusFilter,
    featuredFilter,
    categoryId,
    size,
    sortKey,
    sortDirection,
    page: pagination?.page ?? page,
    pageSize,
    totalCount: pagination?.total ?? 0,
    filteredCount: pagination?.total ?? 0,
    totalPages: pagination?.totalPages ?? 1,
    pageStart: pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0,
    pageEnd: pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0,
    setSearch,
    setStatusFilter,
    setFeaturedFilter,
    setCategoryId,
    setSize,
    setSortKey,
    setSortDirection,
    setPage: setPageValue,
    setPageSize,
  };
}

export type AdminProductTableState = ReturnType<typeof useAdminProductTable>;
export type AdminProductTableProduct = AdminCatalogProduct;
