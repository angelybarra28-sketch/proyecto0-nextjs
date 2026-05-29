'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { fetchAdminDashboard, fetchAdminSales, fetchCollectionSummary } from '@/lib/services/admin/client';
import type { AdminSaleListInput } from '@/lib/services/adminSalesService';
import type { User } from '@/lib/types';
import type { AdminDashboardStats, AdminSaleSummary, CollectionSummary } from '@/lib/supabase/types';
import type { AdminPagination } from '@/lib/services/admin/types';

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useAdminAccess() {
  const { isAdmin, isAuthLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push('/auth');
    }
  }, [isAdmin, isAuthLoading, router]);

  return { isAdmin, isAuthLoading, user };
}

const DEFAULT_ADMIN_SALE_QUERY: AdminSaleListInput = {};

export function useAdminSales(enabled: boolean, query: AdminSaleListInput = DEFAULT_ADMIN_SALE_QUERY) {
  const [sales, setSales] = useState<AdminSaleSummary[]>([]);
  const [pagination, setPagination] = useState<AdminPagination | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [salesError, setSalesError] = useState('');

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    setIsLoadingSales(true);

    fetchAdminSales(query, controller.signal)
      .then((payload) => {
        if (!isMounted) return;
        setSales(payload.sales);
        setPagination(payload.pagination);
        setSalesError('');
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || !isMounted) return;
        console.error('Error loading sales:', error);
        setSalesError('No se pudieron cargar las ventas reales desde Supabase');
      })
      .finally(() => {
        if (isMounted) setIsLoadingSales(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [enabled, query]);

  const overdueSales = useMemo(
    () => sales.filter((sale) => sale.collectionStatus === 'OVERDUE'),
    [sales]
  );

  return { sales, overdueSales, pagination, isLoadingSales, salesError };
}

export function useAdminCollectionSummary(enabled: boolean) {
  const [collectionSummary, setCollectionSummary] = useState<CollectionSummary | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    fetchCollectionSummary(controller.signal)
      .then((payload) => {
        if (!isMounted) return;
        setCollectionSummary(payload);
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || !isMounted) return;
        console.error('Error loading collection summary:', error);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [enabled]);

  return collectionSummary;
}

export function useAdminDashboard(enabled: boolean) {
  const [dashboard, setDashboard] = useState<AdminDashboardStats | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    fetchAdminDashboard(controller.signal)
      .then((payload) => {
        if (!isMounted) return;
        setDashboard(payload);
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || !isMounted) return;
        console.error('Error loading dashboard:', error);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [enabled]);

  return dashboard;
}

export function useAdminUsers(enabled: boolean) {
  const { getAllUsers, deleteUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timeoutId = window.setTimeout(() => setUsers(getAllUsers()), 0);

    return () => window.clearTimeout(timeoutId);
  }, [enabled, getAllUsers]);

  const handleDeleteUser = (id: string) => {
    if (confirm('¿Está seguro de eliminar este usuario?')) {
      deleteUser(id);
      setUsers(getAllUsers());
    }
  };

  return { users, handleDeleteUser };
}
