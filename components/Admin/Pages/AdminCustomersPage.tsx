'use client';

import Link from 'next/link';
import { AdminUsersSection } from '@/components/Admin/Customers/AdminUsersSection';
import { CustomerMetricsSection } from '@/components/Admin/Customers/CustomerMetricsSection';
import { CustomerSalesSummarySection } from '@/components/Admin/Customers/CustomerSalesSummarySection';
import { useAdminAccess, useAdminSales, useAdminUsers } from '@/components/Admin/useAdminData';
import styles from '@/styles/Admin.module.css';

export function AdminCustomersPage() {
  const { isAdmin } = useAdminAccess();
  const { sales } = useAdminSales(isAdmin);
  const { users, handleDeleteUser } = useAdminUsers(isAdmin);

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Clientes</h1>
      <div className={styles.sections}>
        <CustomerMetricsSection sales={sales} />
        <CustomerSalesSummarySection sales={sales} />
        <AdminUsersSection users={users} onDeleteUser={handleDeleteUser} />
      </div>
      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
