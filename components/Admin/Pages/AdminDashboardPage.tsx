'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DayStatusSection } from '@/components/Admin/Dashboard/DayStatusSection';
import { QuickSummarySection } from '@/components/Admin/Dashboard/QuickSummarySection';
import { AlertsSection } from '@/components/Admin/Dashboard/AlertsSection';
import { RecentActivitySection } from '@/components/Admin/Dashboard/RecentActivitySection';
import { QuickActions } from '@/components/Admin/Dashboard/QuickActions';
import { DetailedAnalysisSection } from '@/components/Admin/Dashboard/DetailedAnalysisSection';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import { fetchSmartDashboard } from '@/lib/services/admin/smart-dashboard-client';
import type { SmartDashboardResponse } from '@/lib/services/admin/smart-dashboard-client';
import styles from '@/styles/Admin.module.css';
import dashStyles from '@/components/Admin/Dashboard/Dashboard.module.css';

export function AdminDashboardPage() {
  const { isAdmin } = useAdminAccess();
  const [data, setData] = useState<SmartDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const controller = new AbortController();
    fetchSmartDashboard(controller.signal)
      .then((payload) => {
        setData(payload);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error al cargar el dashboard');
        setLoading(false);
      });

    return () => controller.abort();
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard Inteligente</h1>
      <p className={dashStyles.updateHint}>
        Los datos se actualizan automáticamente cada 60 segundos.
      </p>

      {error && (
        <div className={styles.adminAlertError} role="alert">
          {error}
        </div>
      )}

      <div className={styles.sections}>
        <DayStatusSection dayStatus={data?.dayStatus ?? null} loading={loading} />
        <QuickSummarySection quickSummary={data?.quickSummary ?? null} loading={loading} />
        <AlertsSection alerts={data?.alerts ?? null} loading={loading} />
        <RecentActivitySection activity={data?.activity ?? null} loading={loading} />
        <QuickActions />
        <DetailedAnalysisSection
          dashboard={data?.detailed.dashboard ?? null}
          commercial={data?.detailed.commercial ?? null}
          loading={loading}
        />
      </div>

      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
