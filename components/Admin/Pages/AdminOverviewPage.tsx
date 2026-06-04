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
  const { users, handleToggleUser } = useAdminUsers(isAdmin);

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Panel de Administración</h1>
      <p className={styles.subtitle}>Bienvenido, {user?.nombreApellido}</p>

      <div className={styles.sections}>
        <FinancialDashboardSection dashboard={dashboard} />
        {dashboard && <RankingsSection dashboard={dashboard} />}
        <CollectionSummarySection collectionSummary={collectionSummary} />
        <AdminUsersSection users={users} onToggleUser={handleToggleUser} />
        <AdminSalesTable sales={sales} isLoadingSales={isLoadingSales} salesError={salesError} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginTop: '24px',
        }}
      >
        <Link href="/admin/cuenta-corriente">
          <button className={styles.adminActionButton}>
            Cuenta Corriente
          </button>
        </Link>

        <Link href="/admin/importacion-cartera">
          <button className={styles.adminActionButton}>
            Importar Cartera Excel
          </button>
        </Link>

        <Link href="/">
          <button className={styles.adminActionButton}>
            Volver al inicio
          </button>
        </Link>
      </div>
    </div>
  );
}
