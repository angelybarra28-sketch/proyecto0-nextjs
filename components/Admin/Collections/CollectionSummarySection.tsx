import type { CollectionSummary } from '@/lib/supabase/types';
import { formatCurrency } from '@/components/Admin/shared/formatters';
import styles from '@/styles/Admin.module.css';

type CollectionSummarySectionProps = {
  collectionSummary: CollectionSummary | null;
};

export function CollectionSummarySection({ collectionSummary }: CollectionSummarySectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Resumen de Cobranza</h2>
      {!collectionSummary ? (
        <p className={styles.empty}>Cargando resumen de cobranza...</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              <tr><td>Deuda total</td><td>{formatCurrency(collectionSummary.totalDebt)}</td></tr>
              <tr><td>Deuda vencida</td><td>{formatCurrency(collectionSummary.overdueDebt)}</td></tr>
              <tr><td>Cuotas vencidas</td><td>{collectionSummary.overdueInstallments}</td></tr>
              <tr><td>Ventas morosas</td><td>{collectionSummary.overdueSales}</td></tr>
              <tr><td>Clientes con deuda</td><td>{collectionSummary.customersWithDebt}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
