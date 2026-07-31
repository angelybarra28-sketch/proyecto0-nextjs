import { memo } from 'react';
import Link from 'next/link';
import type { SmartDashboardAlert } from '@/lib/services/admin/smart-dashboard-client';
import styles from '@/styles/Admin.module.css';
import dashStyles from './Dashboard.module.css';
import { EmptyState } from './EmptyState';
import { SectionHeader } from './SectionHeader';
import { Skeleton } from './Skeleton';

function AlertsSkeleton() {
  return (
    <div className={dashStyles.alertList}>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className={dashStyles.skeletonAlert} />
      ))}
    </div>
  );
}

function AlertRow({ alert }: { alert: SmartDashboardAlert }) {
  const isError = alert.level === 'error';
  return (
    <div
      className={`${dashStyles.alertItem} ${isError ? dashStyles.alertItemError : dashStyles.alertItemWarning}`}
      role="alert"
    >
      <span className={dashStyles.alertIcon} aria-hidden="true">
        {isError ? '🔴' : '🟡'}
      </span>
      <div className={dashStyles.alertContent}>
        <div className={dashStyles.alertTitle}>{alert.title}</div>
        <div className={dashStyles.alertDescription}>{alert.description}</div>
      </div>
      <Link href={alert.href} className={dashStyles.alertGo} aria-label={`Ir a ${alert.title}`}>
        Ir
      </Link>
    </div>
  );
}

type AlertsSectionProps = {
  alerts: SmartDashboardAlert[] | null;
  loading: boolean;
};

export const AlertsSection = memo(function AlertsSection({
  alerts,
  loading,
}: AlertsSectionProps) {
  return (
    <section className={`${styles.section} ${dashStyles.sectionEnter}`}>
      <SectionHeader>Alertas</SectionHeader>

      {loading ? (
        <AlertsSkeleton />
      ) : alerts && alerts.length > 0 ? (
        <div className={dashStyles.alertList}>
          {alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="✅"
          title="No hay alertas"
          hint="No hay problemas pendientes. Todo en orden."
        />
      )}
    </section>
  );
});
