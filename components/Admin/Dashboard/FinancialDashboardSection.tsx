import type { AdminDashboardStats } from '@/lib/supabase/types';
import { formatCurrency } from '@/components/Admin/shared/formatters';
import styles from '@/styles/Admin.module.css';

type FinancialDashboardSectionProps = {
  dashboard: AdminDashboardStats | null;
};

export function FinancialDashboardSection({ dashboard }: FinancialDashboardSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Dashboard Financiero</h2>
      {!dashboard ? (
        <p className={styles.empty}>Cargando métricas...</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              <tr><td>Ventas del mes</td><td>{dashboard.currentMonthSalesCount}</td></tr>
              <tr><td>Monto vendido del mes</td><td>{formatCurrency(dashboard.currentMonthSoldAmount)}</td></tr>
              <tr><td>Monto cobrado del mes</td><td>{formatCurrency(dashboard.currentMonthCollectedAmount)}</td></tr>
              <tr><td>Ticket promedio</td><td>{formatCurrency(dashboard.averageTicket)}</td></tr>
              <tr><td>Deuda total</td><td>{formatCurrency(dashboard.collection.totalDebt)}</td></tr>
              <tr><td>Deuda vencida</td><td>{formatCurrency(dashboard.collection.overdueDebt)}</td></tr>
              <tr><td>Clientes con deuda</td><td>{dashboard.collection.customersWithDebt}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
