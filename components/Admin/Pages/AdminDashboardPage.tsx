'use client';

import Link from 'next/link';
import { FinancialDashboardSection } from '@/components/Admin/Dashboard/FinancialDashboardSection';
import { RankingsSection } from '@/components/Admin/Dashboard/RankingsSection';
import { useAdminAccess, useAdminDashboard } from '@/components/Admin/useAdminData';
import styles from '@/styles/Admin.module.css';

export function AdminDashboardPage() {
  const { isAdmin } = useAdminAccess();
  const dashboard = useAdminDashboard(isAdmin);

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard Administrativo</h1>
      <div className={styles.sections}>
        <FinancialDashboardSection dashboard={dashboard} />
        {dashboard && <RankingsSection dashboard={dashboard} />}
      </div>
      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
