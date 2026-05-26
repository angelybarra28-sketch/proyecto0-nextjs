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
  const { isAdmin, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin) {
      router.push('/auth');
    }
  }, [isAdmin, router]);

  return { isAdmin, user };
}

export function useAdminSales(enabled: boolean, query: AdminSaleListInput = {}) {
  const [sales, setSales] = useState<AdminSaleSummary[]>([]);
  const [pagination, setPagination] = useState<AdminPagination | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [salesError, setSalesError] = useState('');

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    const loadingTimeoutId = window.setTimeout(() => setIsLoadingSales(true), 0);

    fetchAdminSales(query, controller.signal)
      .then((payload) => {
        setSales(payload.sales);
        setPagination(payload.pagination);
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        console.error('Error loading sales:', error);
        setSalesError('No se pudieron cargar las ventas reales desde Supabase');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingSales(false);
      });

    return () => {
      window.clearTimeout(loadingTimeoutId);
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

    const controller = new AbortController();

    fetchCollectionSummary(controller.signal)
      .then(setCollectionSummary)
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        console.error('Error loading collection summary:', error);
      });

    return () => controller.abort();
  }, [enabled]);

  return collectionSummary;
}

export function useAdminDashboard(enabled: boolean) {
  const [dashboard, setDashboard] = useState<AdminDashboardStats | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();

    fetchAdminDashboard(controller.signal)
      .then(setDashboard)
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        console.error('Error loading dashboard:', error);
      });

    return () => controller.abort();
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

    window.setTimeout(() => setUsers(getAllUsers()), 0);
  }, [enabled, getAllUsers]);

  const handleDeleteUser = (id: string) => {
    if (confirm('¿Está seguro de eliminar este usuario?')) {
      deleteUser(id);
      setUsers(getAllUsers());
    }
  };

  return { users, handleDeleteUser };
}
