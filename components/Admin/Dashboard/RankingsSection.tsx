import type { AdminDashboardStats } from '@/lib/supabase/types';
import { formatCurrency } from '@/components/Admin/shared/formatters';
import styles from '@/styles/Admin.module.css';

type RankingsSectionProps = {
  dashboard: AdminDashboardStats;
};

export function RankingsSection({ dashboard }: RankingsSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Rankings Básicos</h2>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Nombre</th>
              <th>Cantidad</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.topProducts.map((product) => (
              <tr key={`product-${product.label}`}>
                <td>Producto</td>
                <td>{product.label}</td>
                <td>{product.quantity}</td>
                <td>{formatCurrency(product.amount)}</td>
              </tr>
            ))}
            {dashboard.topCategories.map((category) => (
              <tr key={`category-${category.label}`}>
                <td>Categoría</td>
                <td>{category.label}</td>
                <td>{category.quantity}</td>
                <td>{formatCurrency(category.amount)}</td>
              </tr>
            ))}
            {dashboard.topCustomers.map((customer) => (
              <tr key={`customer-${customer.customerId}`}>
                <td>Cliente</td>
                <td>{customer.customerName}</td>
                <td>{customer.salesCount}</td>
                <td>{formatCurrency(customer.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
