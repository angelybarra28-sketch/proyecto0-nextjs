'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { fetchAdminDashboard, fetchAdminSales, fetchCollectionSummary } from '@/lib/services/admin/client';
import type { User } from '@/lib/types';
import type { AdminDashboardStats, AdminSaleSummary, CollectionSummary } from '@/lib/supabase/types';

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

export function useAdminSales(enabled: boolean) {
  const [sales, setSales] = useState<AdminSaleSummary[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [salesError, setSalesError] = useState('');

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchAdminSales()
      .then(setSales)
      .catch((error: unknown) => {
        console.error('Error loading sales:', error);
        setSalesError('No se pudieron cargar las ventas reales desde Supabase');
      })
      .finally(() => setIsLoadingSales(false));
  }, [enabled]);

  const overdueSales = useMemo(
    () => sales.filter((sale) => sale.collectionStatus === 'OVERDUE'),
    [sales]
  );

  return { sales, overdueSales, isLoadingSales, salesError };
}

export function useAdminCollectionSummary(enabled: boolean) {
  const [collectionSummary, setCollectionSummary] = useState<CollectionSummary | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchCollectionSummary()
      .then(setCollectionSummary)
      .catch((error: unknown) => console.error('Error loading collection summary:', error));
  }, [enabled]);

  return collectionSummary;
}

export function useAdminDashboard(enabled: boolean) {
  const [dashboard, setDashboard] = useState<AdminDashboardStats | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchAdminDashboard()
      .then(setDashboard)
      .catch((error: unknown) => console.error('Error loading dashboard:', error));
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
