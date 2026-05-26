'use client';

import { useMemo, useState } from 'react';
import type { AdminSaleListInput, AdminSaleSorting } from '@/lib/services/adminSalesService';
import type { CollectionStatus, SaleStatus } from '@/lib/supabase/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export type AdminSaleStatusFilter = SaleStatus | 'all';
export type AdminCollectionStatusFilter = CollectionStatus | 'all';
export type AdminSaleSortKey = AdminSaleSorting['sortKey'];
export type AdminSaleSortDirection = AdminSaleSorting['direction'];

const DEFAULT_PAGE_SIZE = 10;

export function useAdminSalesTable() {
  const [search, setSearchValue] = useState('');
  const [saleStatus, setSaleStatusValue] = useState<AdminSaleStatusFilter>('all');
  const [collectionStatus, setCollectionStatusValue] = useState<AdminCollectionStatusFilter>('all');
  const [dateFrom, setDateFromValue] = useState('');
  const [dateTo, setDateToValue] = useState('');
  const [sortKey, setSortKeyValue] = useState<AdminSaleSortKey>('saleDate');
  const [sortDirection, setSortDirectionValue] = useState<AdminSaleSortDirection>('desc');
  const [page, setPageValue] = useState(1);
  const [pageSize, setPageSizeValue] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search);

  const query = useMemo<AdminSaleListInput>(() => ({
    page,
    limit: pageSize,
    search: debouncedSearch,
    saleStatus,
    collectionStatus,
    dateFrom,
    dateTo,
    sortKey,
    direction: sortDirection,
  }), [collectionStatus, dateFrom, dateTo, debouncedSearch, page, pageSize, saleStatus, sortDirection, sortKey]);

  const resetPage = () => setPageValue(1);

  return {
    query,
    search,
    saleStatus,
    collectionStatus,
    dateFrom,
    dateTo,
    sortKey,
    sortDirection,
    page,
    pageSize,
    setSearch(value: string) {
      setSearchValue(value);
      resetPage();
    },
    setSaleStatus(value: AdminSaleStatusFilter) {
      setSaleStatusValue(value);
      resetPage();
    },
    setCollectionStatus(value: AdminCollectionStatusFilter) {
      setCollectionStatusValue(value);
      resetPage();
    },
    setDateFrom(value: string) {
      setDateFromValue(value);
      resetPage();
    },
    setDateTo(value: string) {
      setDateToValue(value);
      resetPage();
    },
    setSortKey(value: AdminSaleSortKey) {
      setSortKeyValue(value);
      resetPage();
    },
    setSortDirection(value: AdminSaleSortDirection) {
      setSortDirectionValue(value);
      resetPage();
    },
    setPage: setPageValue,
    setPageSize(value: number) {
      setPageSizeValue(value);
      resetPage();
    },
  };
}

export type AdminSalesTableState = ReturnType<typeof useAdminSalesTable>;
