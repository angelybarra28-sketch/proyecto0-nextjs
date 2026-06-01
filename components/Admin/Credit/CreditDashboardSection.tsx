import type { CreditDashboard } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

type CreditDashboardSectionProps = {
  dashboard: CreditDashboard | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

export function CreditDashboardSection({ dashboard }: CreditDashboardSectionProps) {
  if (!dashboard) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Resumen de Cuenta Corriente</h2>
      <div className={styles.grid4}>
        <div className={styles.card}>
          <p className={styles.label}>Total Financiado</p>
          <p className={styles.value}>{formatCurrency(dashboard.totalFinanced)}</p>
        </div>
        <div className={styles.card}>
          <p className={styles.label}>Total Cobrado</p>
          <p className={styles.value}>{formatCurrency(dashboard.totalCollected)}</p>
        </div>
        <div className={styles.card}>
          <p className={styles.label}>Total Pendiente</p>
          <p className={styles.value}>{formatCurrency(dashboard.totalPending)}</p>
        </div>
        <div className={styles.card}>
          <p className={styles.label}>Clientes con Deuda</p>
          <p className={styles.value}>{dashboard.customersWithDebt} / {dashboard.customerCount}</p>
        </div>
      </div>
    </section>
  );
}
