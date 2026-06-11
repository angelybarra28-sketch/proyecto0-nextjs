import type { AdminDashboardStats } from '@/lib/supabase/types';
import { formatCurrency } from '@/components/Admin/shared/formatters';
import styles from '@/styles/Admin.module.css';

type CommercialMetrics = {
  currentMonthlyCollection: number;
  monthlyReplacement: number;
  replacementCount: number;
  finishedCards: number;
  finishedInstallmentsAmount: number;
  projectedNextMonth: number;
};

type FinancialDashboardSectionProps = {
  dashboard: AdminDashboardStats | null;
  commercial?: CommercialMetrics | null;
};

function KpiCard({
  label,
  value,
  subvalue,
  valueColor = '#f5f2ec',
}: {
  label: string;
  value: string;
  subvalue?: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: '#262422',
        border: '1px solid #363330',
        borderRadius: 10,
        padding: '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: '#b8a89c',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1.2,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
      {subvalue && (
        <span style={{ fontSize: 12, color: '#b8a89c' }}>{subvalue}</span>
      )}
    </div>
  );
}

export function FinancialDashboardSection({ dashboard, commercial }: FinancialDashboardSectionProps) {
  if (!dashboard) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dashboard Financiero</h2>
        <p className={styles.empty}>Cargando métricas...</p>
      </section>
    );
  }

  const credit = dashboard.credit;
  const hasCredit = !!credit;

  const balance = commercial
    ? commercial.monthlyReplacement - commercial.finishedInstallmentsAmount
    : 0;
  const balanceColor = balance >= 0 ? '#34d399' : '#f87171';

  return (
    <section className={styles.section} style={{ padding: '24px' }}>
      <h2 className={styles.sectionTitle} style={{ marginTop: 0, marginBottom: 18 }}>
        Dashboard Financiero
      </h2>

      {hasCredit ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          <KpiCard label="Total Financiado" value={formatCurrency(credit.totalFinanced)} />
          <KpiCard label="Total Cobrado" value={formatCurrency(credit.totalCollected)} />
          <KpiCard label="Total Pendiente" value={formatCurrency(credit.totalPending)} />
          <KpiCard label="Ventas Activas" value={String(credit.activeAccounts)} />
          <KpiCard label="Cobrado Mes Actual" value={formatCurrency(credit.currentMonthCollected)} />
          <KpiCard label="Cobrado Mes Anterior" value={formatCurrency(credit.previousMonthCollected)} />
          <KpiCard label="Clientes con Deuda" value={String(credit.customersWithDebt)} />

          {commercial && (
            <>
              <KpiCard
                label="Reposición del Mes"
                value={formatCurrency(commercial.monthlyReplacement)}
                subvalue={`Cantidad: ${commercial.replacementCount} ventas`}
                valueColor="#34d399"
              />
              <KpiCard
                label="Ventas Finalizadas"
                value={formatCurrency(commercial.finishedInstallmentsAmount)}
                subvalue={`Cantidad: ${commercial.finishedCards} ventas`}
                valueColor="#f87171"
              />
              <KpiCard
                label="Balance de Cartera"
                value={formatCurrency(balance)}
                subvalue="Reposición vs. Terminadas"
                valueColor={balanceColor}
              />
              <KpiCard
                label="Cobranza Actual"
                value={formatCurrency(commercial.currentMonthlyCollection)}
              />
              <KpiCard
                label="Proyección Próxima Cobranza"
                value={formatCurrency(commercial.projectedNextMonth)}
              />
            </>
          )}
        </div>
      ) : (
        <p className={styles.empty}>No hay datos de cuenta corriente disponibles</p>
      )}
    </section>
  );
}
