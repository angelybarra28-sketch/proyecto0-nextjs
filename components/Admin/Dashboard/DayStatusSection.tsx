import { memo } from 'react';
import { formatCurrency } from '@/components/Admin/shared/formatters';
import type { SmartDashboardDayStatus } from '@/lib/services/admin/smart-dashboard-client';
import styles from '@/styles/Admin.module.css';
import dashStyles from './Dashboard.module.css';
import { KpiCard } from './KpiCard';
import { SectionHeader } from './SectionHeader';
import { Skeleton } from './Skeleton';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hace 1 día';
  if (days < 30) return `hace ${days} días`;
  return `hace ${Math.floor(days / 30)} meses`;
}

function systemLabel(status: string, warnings: number, errors: number): string {
  if (status === 'error') return `${errors} error(es)`;
  if (status === 'warning') return `${warnings} advertencia(s)`;
  return 'OK';
}

function DayStatusSkeleton() {
  return (
    <div className={dashStyles.kpiGrid}>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className={dashStyles.skeletonKpi} />
      ))}
    </div>
  );
}

type DayStatusSectionProps = {
  dayStatus: SmartDashboardDayStatus | null;
  loading: boolean;
};

export const DayStatusSection = memo(function DayStatusSection({
  dayStatus,
  loading,
}: DayStatusSectionProps) {
  return (
    <section className={`${styles.section} ${dashStyles.sectionEnter}`}>
      <SectionHeader>Estado del día</SectionHeader>

      {loading || !dayStatus ? (
        <DayStatusSkeleton />
      ) : (
        <div className={dashStyles.kpiGrid}>
          <KpiCard
            icon="⏰"
            label="Cuotas vencidas"
            value={formatCurrency(dayStatus.creditOverdue.total)}
            subvalue={`${dayStatus.creditOverdue.count} cuota(s)`}
            description="Cuotas con fecha vencida y saldo pendiente"
            tone="danger"
          />
          <KpiCard
            icon="🧾"
            label="Compras pendientes"
            value={String(dayStatus.comprasPendientes.count)}
            subvalue={formatCurrency(dayStatus.comprasPendientes.amount)}
            description="Facturas de proveedores sin pagar"
            tone="warning"
          />
          <KpiCard
            icon="🗑️"
            label="Productos en papelera"
            value={String(dayStatus.trashProducts)}
            description="Productos eliminados que ocupan espacio en el catálogo"
            tone="warning"
          />
          <KpiCard
            icon="💾"
            label="Último backup"
            value={dayStatus.lastBackup.date ? timeAgo(dayStatus.lastBackup.date) : 'Sin backups'}
            description="Exportación completa más reciente"
            tone="success"
          />
          <KpiCard
            icon="🩺"
            label="Estado del sistema"
            value={systemLabel(dayStatus.system.status, dayStatus.system.warnings, dayStatus.system.errors)}
            description="Resultado del chequeo automático de mantenimiento"
            tone="info"
          />
        </div>
      )}
    </section>
  );
});
