import type { AdminSaleSummary } from '@/lib/supabase/types';
import { formatCurrency } from '@/components/Admin/shared/formatters';
import styles from '@/styles/Admin.module.css';

type AdminSalesSummarySectionProps = {
  sales: AdminSaleSummary[];
};

export function AdminSalesSummarySection({ sales }: AdminSalesSummarySectionProps) {
  const totalAmount = sales.reduce((sum, sale) => sum + sale.total, 0);
  const overdueSales = sales.filter((sale) => sale.collectionStatus === 'OVERDUE').length;
  const pendingCollectionSales = sales.filter((sale) => sale.collectionStatus !== 'PAID').length;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Resumen de Ventas</h2>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <tbody>
            <tr><td>Ventas totales</td><td>{sales.length}</td></tr>
            <tr><td>Monto total vendido</td><td>{formatCurrency(totalAmount)}</td></tr>
            <tr><td>Ventas con cobranza pendiente</td><td>{pendingCollectionSales}</td></tr>
            <tr><td>Ventas morosas</td><td>{overdueSales}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
