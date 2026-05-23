'use client';

import Link from 'next/link';
import { CollectionSummarySection } from '@/components/Admin/Collections/CollectionSummarySection';
import { AdminSalesTable } from '@/components/Admin/Sales/AdminSalesTable';
import { useAdminAccess, useAdminCollectionSummary, useAdminSales } from '@/components/Admin/useAdminData';
import styles from '@/styles/Admin.module.css';

export function AdminCollectionsPage() {
  const { isAdmin } = useAdminAccess();
  const collectionSummary = useAdminCollectionSummary(isAdmin);
  const { overdueSales, isLoadingSales, salesError } = useAdminSales(isAdmin);

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Cobranzas</h1>
      <div className={styles.sections}>
        <CollectionSummarySection collectionSummary={collectionSummary} />
        <AdminSalesTable sales={overdueSales} isLoadingSales={isLoadingSales} salesError={salesError} />
      </div>
      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
