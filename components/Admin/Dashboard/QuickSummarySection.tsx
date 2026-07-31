import { memo } from 'react';
import { formatCurrency } from '@/components/Admin/shared/formatters';
import type { SmartDashboardQuickSummary } from '@/lib/services/admin/smart-dashboard-client';
import styles from '@/styles/Admin.module.css';
import dashStyles from './Dashboard.module.css';
import { KpiCard } from './KpiCard';
import { SectionHeader } from './SectionHeader';
import { Skeleton } from './Skeleton';

function QuickSummarySkeleton() {
  return (
    <div className={dashStyles.kpiGrid}>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className={dashStyles.skeletonKpi} />
      ))}
    </div>
  );
}

type QuickSummarySectionProps = {
  quickSummary: SmartDashboardQuickSummary | null;
  loading: boolean;
};

export const QuickSummarySection = memo(function QuickSummarySection({
  quickSummary,
  loading,
}: QuickSummarySectionProps) {
  return (
    <section className={`${styles.section} ${dashStyles.sectionEnter}`}>
      <SectionHeader>Resumen rápido</SectionHeader>

      {loading || !quickSummary ? (
        <QuickSummarySkeleton />
      ) : (
        <div className={dashStyles.kpiGrid}>
          <KpiCard
            icon="🛒"
            label="Ventas del mes"
            value={formatCurrency(quickSummary.monthSoldAmount)}
            subvalue={`${quickSummary.monthSalesCount} venta(s)`}
            description="Ingresos por ventas en el mes actual"
          />
          <KpiCard
            icon="💵"
            label="Cobrado del mes"
            value={formatCurrency(quickSummary.monthCollectedAmount)}
            description="Monto cobrado en el mes actual"
            tone="success"
          />
          <KpiCard
            icon="📉"
            label="Pendiente"
            value={formatCurrency(quickSummary.collectionPending)}
            description="Saldo pendiente total de la cuenta corriente"
            tone="danger"
          />
          <KpiCard
            icon="🎟️"
            label="Ticket promedio"
            value={formatCurrency(quickSummary.averageTicket)}
            description="Venta promedio por operación"
          />
          <KpiCard
            icon="🛍️"
            label="Ventas de hoy"
            value={formatCurrency(quickSummary.todaySoldAmount)}
            subvalue={`${quickSummary.todaySalesCount} venta(s)`}
            description="Ventas registradas en el día de hoy"
            tone="info"
          />
          <KpiCard
            icon="📈"
            label="Crecimiento mensual"
            value={`${quickSummary.monthlyGrowthPercentage.toFixed(1)}%`}
            description="Variación de ventas respecto al mes anterior"
            tone={quickSummary.monthlyGrowthPercentage >= 0 ? 'success' : 'danger'}
          />
        </div>
      )}
    </section>
  );
});
