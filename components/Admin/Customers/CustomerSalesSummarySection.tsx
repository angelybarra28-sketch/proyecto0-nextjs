import type { AdminSaleSummary } from '@/lib/supabase/types';
import { formatCurrency } from '@/components/Admin/shared/formatters';
import styles from '@/styles/Admin.module.css';

type CustomerSalesSummarySectionProps = {
  sales: AdminSaleSummary[];
};

type CustomerSummary = {
  name: string;
  phone: string | null;
  salesCount: number;
  totalAmount: number;
  overdueSales: number;
};

export function CustomerSalesSummarySection({ sales }: CustomerSalesSummarySectionProps) {
  const customers = Array.from(
    sales.reduce((map, sale) => {
      const current = map.get(sale.customerName) ?? {
        name: sale.customerName,
        phone: sale.customerPhone,
        salesCount: 0,
        totalAmount: 0,
        overdueSales: 0,
      };

      current.salesCount += 1;
      current.totalAmount += sale.total;
      current.overdueSales += sale.collectionStatus === 'OVERDUE' ? 1 : 0;
      map.set(sale.customerName, current);

      return map;
    }, new Map<string, CustomerSummary>()).values()
  );

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Clientes con Ventas ({customers.length})</h2>
      {customers.length === 0 ? (
        <p className={styles.empty}>No hay clientes con ventas registradas</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Ventas</th>
                <th>Monto vendido</th>
                <th>Ventas morosas</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.name}>
                  <td>{customer.name}</td>
                  <td>{customer.phone ?? '-'}</td>
                  <td>{customer.salesCount}</td>
                  <td>{formatCurrency(customer.totalAmount)}</td>
                  <td>{customer.overdueSales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
