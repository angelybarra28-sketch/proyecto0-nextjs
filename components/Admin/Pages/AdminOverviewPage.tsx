'use client';

import Link from 'next/link';
import { CollectionSummarySection } from '@/components/Admin/Collections/CollectionSummarySection';
import { AdminUsersSection } from '@/components/Admin/Customers/AdminUsersSection';
import { FinancialDashboardSection } from '@/components/Admin/Dashboard/FinancialDashboardSection';
import { RankingsSection } from '@/components/Admin/Dashboard/RankingsSection';
import { AdminSalesTable } from '@/components/Admin/Sales/AdminSalesTable';
import { useAdminAccess, useAdminCollectionSummary, useAdminDashboard, useAdminSales, useAdminUsers } from '@/components/Admin/useAdminData';
import styles from '@/styles/Admin.module.css';

export function AdminOverviewPage() {
  const { isAdmin, user } = useAdminAccess();
  const { sales, isLoadingSales, salesError } = useAdminSales(isAdmin);
  const collectionSummary = useAdminCollectionSummary(isAdmin);
  const dashboard = useAdminDashboard(isAdmin);
  const { users, handleDeleteUser } = useAdminUsers(isAdmin);

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Panel de Administración</h1>
      <p className={styles.subtitle}>Bienvenido, {user?.nombreApellido}</p>

      <div className={styles.sections}>
        <FinancialDashboardSection dashboard={dashboard} />
        {dashboard && <RankingsSection dashboard={dashboard} />}
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
