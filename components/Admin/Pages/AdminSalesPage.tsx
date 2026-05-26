'use client';

import Link from 'next/link';
import { AdminSalesSummarySection } from '@/components/Admin/Sales/AdminSalesSummarySection';
import { AdminSalesTable } from '@/components/Admin/Sales/AdminSalesTable';
import { useAdminAccess, useAdminSales } from '@/components/Admin/useAdminData';
import { useAdminSalesTable } from '@/hooks/useAdminSalesTable';
import styles from '@/styles/Admin.module.css';

export function AdminSalesPage() {
  const { isAdmin } = useAdminAccess();
  const table = useAdminSalesTable();
  const { sales, pagination, isLoadingSales, salesError } = useAdminSales(isAdmin, table.query);

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Ventas Administrativas</h1>
      <div className={styles.sections}>
        <AdminSalesSummarySection sales={sales} />
        <AdminSalesTable sales={sales} table={table} pagination={pagination} isLoadingSales={isLoadingSales} salesError={salesError} />
      </div>
      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
