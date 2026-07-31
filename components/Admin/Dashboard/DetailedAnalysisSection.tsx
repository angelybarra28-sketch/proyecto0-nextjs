'use client';

import { memo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { AdminDashboardStats } from '@/lib/supabase/types';
import type { SmartDashboardCommercial } from '@/lib/services/admin/smart-dashboard-client';
import styles from '@/styles/Admin.module.css';
import dashStyles from './Dashboard.module.css';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

const DetailedAnalysisContent = dynamic(
  () => import('./detailed-analysis-content').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'grid', gap: 10 }}>
        <Skeleton className={dashStyles.skeletonBlock} />
        <Skeleton className={dashStyles.skeletonBlock} />
      </div>
    ),
  },
);

function DetailedAnalysisSkeleton() {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <Skeleton className={dashStyles.skeletonBlock} />
      <Skeleton className={dashStyles.skeletonBlock} />
    </div>
  );
}

type DetailedAnalysisSectionProps = {
  dashboard: AdminDashboardStats | null;
  commercial: SmartDashboardCommercial | null;
  loading: boolean;
};

export const DetailedAnalysisSection = memo(function DetailedAnalysisSection({
  dashboard,
  commercial,
  loading,
}: DetailedAnalysisSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <details
      className={`${styles.section} ${dashStyles.details} ${dashStyles.sectionEnter}`}
      style={{ marginTop: 16 }}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className={dashStyles.summaryToggle}>
        Ver análisis detallado
        <span className={dashStyles.summaryToggleIcon} aria-hidden="true">
          ▶
        </span>
      </summary>

      <div className={dashStyles.summaryContent}>
        {loading ? (
          <DetailedAnalysisSkeleton />
        ) : dashboard ? (
          open ? (
            <DetailedAnalysisContent dashboard={dashboard} commercial={commercial} />
          ) : null
        ) : (
          <EmptyState
            icon="📊"
            title="Análisis no disponible"
            hint="No hay datos de análisis para mostrar en este momento."
          />
        )}
      </div>
    </details>
  );
});
