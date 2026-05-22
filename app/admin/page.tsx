'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User } from '@/lib/types';
import { CollectionSummarySection } from '@/components/Admin/Collections/CollectionSummarySection';
import { AdminUsersSection } from '@/components/Admin/Customers/AdminUsersSection';
import { FinancialDashboardSection } from '@/components/Admin/Dashboard/FinancialDashboardSection';
import { RankingsSection } from '@/components/Admin/Dashboard/RankingsSection';
import { AdminSalesTable } from '@/components/Admin/Sales/AdminSalesTable';
import { fetchAdminDashboard, fetchAdminSales, fetchCollectionSummary } from '@/lib/services/admin/client';
import type { AdminDashboardStats, AdminSaleSummary, CollectionSummary } from '@/lib/supabase/types';
import styles from '@/styles/Admin.module.css';

export default function AdminPage() {
  const { isAdmin, getAllUsers, deleteUser, user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [sales, setSales] = useState<AdminSaleSummary[]>([]);
  const [collectionSummary, setCollectionSummary] = useState<CollectionSummary | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardStats | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [salesError, setSalesError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      router.push('/auth');
      return;
    }

    window.setTimeout(() => setUsers(getAllUsers()), 0);

    fetchAdminSales()
      .then(setSales)
      .catch((error: unknown) => {
        console.error('Error loading sales:', error);
        setSalesError('No se pudieron cargar las ventas reales desde Supabase');
      })
      .finally(() => setIsLoadingSales(false));

    fetchCollectionSummary()
      .then(setCollectionSummary)
      .catch((error: unknown) => console.error('Error loading collection summary:', error));

    fetchAdminDashboard()
      .then(setDashboard)
      .catch((error: unknown) => console.error('Error loading dashboard:', error));
  }, [isAdmin, getAllUsers, router]);

  const handleDeleteUser = (id: string) => {
    if (confirm('¿Está seguro de eliminar este usuario?')) {
      deleteUser(id);
      setUsers(getAllUsers());
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Panel de Administración</h1>
      <p className={styles.subtitle}>Bienvenido, {user?.nombreApellido}</p>

      <div className={styles.sections}>
        <FinancialDashboardSection dashboard={dashboard} />

        {dashboard && (
          <RankingsSection dashboard={dashboard} />
        )}

        <CollectionSummarySection collectionSummary={collectionSummary} />

        <AdminUsersSection users={users} onDeleteUser={handleDeleteUser} />

        <AdminSalesTable sales={sales} isLoadingSales={isLoadingSales} salesError={salesError} />
      </div>

      <div className={styles.backLink}>
        <Link href="/">Volver al inicio</Link>
      </div>
    </div>
  );
}
