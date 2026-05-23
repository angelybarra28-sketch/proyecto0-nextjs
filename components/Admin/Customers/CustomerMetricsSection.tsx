import type { AdminSaleSummary } from '@/lib/supabase/types';
import styles from '@/styles/Admin.module.css';

type CustomerMetricsSectionProps = {
  sales: AdminSaleSummary[];
};

export function CustomerMetricsSection({ sales }: CustomerMetricsSectionProps) {
  const customerNames = new Set(sales.map((sale) => sale.customerName));
  const customersWithOverdueSales = new Set(
    sales
      .filter((sale) => sale.collectionStatus === 'OVERDUE')
      .map((sale) => sale.customerName)
  );

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Métricas de Clientes</h2>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <tbody>
            <tr><td>Clientes con ventas</td><td>{customerNames.size}</td></tr>
            <tr><td>Clientes con deuda futura</td><td>Preparado para integrar deuda por cliente</td></tr>
            <tr><td>Clientes con ventas morosas</td><td>{customersWithOverdueSales.size}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
