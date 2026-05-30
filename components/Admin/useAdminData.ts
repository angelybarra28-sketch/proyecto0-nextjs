'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { fetchAdminDashboard, fetchAdminSales, fetchAdminUsers, fetchCollectionSummary, toggleAdminUser } from '@/lib/services/admin/client';
import type { AdminSaleListInput } from '@/lib/services/adminSalesService';
import type { User, AdminUserView } from '@/lib/types';
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
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');

  const loadUsers = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingUsers(true);
    setUsersError('');

    try {
      const data = await fetchAdminUsers(signal);
      setUsers(data);
    } catch (error) {
      if (signal?.aborted) return;
      console.error('Error loading users:', error);
      setUsersError('No se pudieron cargar los usuarios');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    fetchAdminUsers(controller.signal)
      .then((data) => {
        if (!isMounted) return;
        setUsers(data);
        setUsersError('');
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || !isMounted) return;
        console.error('Error loading users:', error);
        setUsersError('No se pudieron cargar los usuarios');
      })
      .finally(() => {
        if (isMounted) setIsLoadingUsers(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [enabled]);

  const handleToggleUser = async (id: string, isActive: boolean) => {
    try {
      await toggleAdminUser(id, isActive);
      await loadUsers();
    } catch (error) {
      console.error('Error toggling user:', error);
      alert(error instanceof Error ? error.message : 'No se pudo actualizar el usuario');
    }
  };

  return { users, isLoadingUsers, usersError, handleToggleUser, reloadUsers: loadUsers };
}
