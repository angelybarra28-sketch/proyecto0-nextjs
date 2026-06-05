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
              {dashboard.credit && (
                <>
                  <tr className={styles.creditSubheader}><td colSpan={2}>Cuenta Corriente (Crédito)</td></tr>
                  <tr><td>Total Financiado (CC)</td><td>{formatCurrency(dashboard.credit.totalFinanced)}</td></tr>
                  <tr><td>Total Cobrado (CC)</td><td>{formatCurrency(dashboard.credit.totalCollected)}</td></tr>
                  <tr><td>Total Pendiente (CC)</td><td>{formatCurrency(dashboard.credit.totalPending)}</td></tr>
                  <tr><td>Ventas activas (CC)</td><td>{dashboard.credit.activeAccounts}</td></tr>
                  <tr><td>Ventas finalizadas (CC)</td><td>{dashboard.credit.finishedAccounts}</td></tr>
                  <tr><td>Cobrado mes actual (CC)</td><td>{formatCurrency(dashboard.credit.currentMonthCollected)}</td></tr>
                  <tr><td>Cobrado mes anterior (CC)</td><td>{formatCurrency(dashboard.credit.previousMonthCollected)}</td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
