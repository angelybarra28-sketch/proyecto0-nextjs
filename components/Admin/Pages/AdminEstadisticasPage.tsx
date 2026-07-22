'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminAccess, useAdminDashboard } from '@/components/Admin/useAdminData';
import { useCreditAccounts } from '@/components/Admin/useCreditAccounts';
import { FinancialDashboardSection } from '@/components/Admin/Dashboard/FinancialDashboardSection';
import { CreditDashboardSection } from '@/components/Admin/Credit/CreditDashboardSection';
import { fetchCommercialMetrics } from '@/lib/services/admin/client';
import type { CreditAccountSummary } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

export function AdminEstadisticasPage() {
  const { isAdmin } = useAdminAccess();
  const dashboardStats = useAdminDashboard(isAdmin);
  const { dashboard, isLoading, error } = useCreditAccounts(isAdmin);

  const [commercial, setCommercial] = useState<{
    currentMonthlyCollection: number;
    monthlyReplacement: number;
    replacementCount: number;
    finishedCards: number;
    finishedInstallmentsAmount: number;
    projectedNextMonth: number;
    finishedAccountsList: CreditAccountSummary[];
  } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetchCommercialMetrics()
      .then((data) => {
        if (!cancelled) setCommercial(data);
      })
      .catch((err) => {
        if (!cancelled) console.error('Commercial metrics not available:', err);
      });
    return () => { cancelled = true; };
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <div className={styles.headerCompact}>
        <div>
          <h1 className={styles.title} style={{ margin: 0, textAlign: 'left' }}>
            Estadísticas
          </h1>
          <p className={styles.subtitle} style={{ margin: '2px 0 0 0', textAlign: 'left', fontSize: 14, color: '#d3cdc4' }}>
            Resumen general, evolución de cobranzas y métricas comerciales
          </p>
        </div>
      </div>

      {error && <div className={styles.adminAlertError}>{error}</div>}

      <div className={styles.sections}>
        <FinancialDashboardSection
          dashboard={dashboardStats}
          commercial={commercial ? {
            currentMonthlyCollection: commercial.currentMonthlyCollection,
            monthlyReplacement: commercial.monthlyReplacement,
            replacementCount: commercial.replacementCount,
            finishedCards: commercial.finishedCards,
            finishedInstallmentsAmount: commercial.finishedInstallmentsAmount,
            projectedNextMonth: commercial.projectedNextMonth,
          } : null}
        />
        {isLoading ? (
          <p className={styles.empty}>Cargando estadísticas...</p>
        ) : (
          <CreditDashboardSection dashboard={dashboard} />
        )}
      </div>

      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
