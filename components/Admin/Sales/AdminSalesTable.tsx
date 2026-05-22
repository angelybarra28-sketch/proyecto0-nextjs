import Link from 'next/link';
import type { AdminSaleSummary } from '@/lib/supabase/types';
import { formatCurrency, getStatusClass } from '@/components/Admin/shared/formatters';
import styles from '@/styles/Admin.module.css';

type AdminSalesTableProps = {
  sales: AdminSaleSummary[];
  isLoadingSales: boolean;
  salesError: string;
};

export function AdminSalesTable({ sales, isLoadingSales, salesError }: AdminSalesTableProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Ventas Realizadas ({sales.length})</h2>

      {isLoadingSales && <p className={styles.empty}>Cargando ventas...</p>}

      {salesError && <p className={styles.empty}>{salesError}</p>}

      {!isLoadingSales && !salesError && sales.length === 0 ? (
        <p className={styles.empty}>No hay ventas registradas en Supabase</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Venta</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Productos</th>
                <th>Venta</th>
                <th>Cobranza</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.saleNumber}</td>
                  <td>{sale.customerName}</td>
                  <td>{new Date(sale.saleDate).toLocaleDateString('es-AR')}</td>
                  <td>{formatCurrency(sale.total)}</td>
                  <td>{sale.itemCount}</td>
                  <td>
                    <span className={`${styles.status} ${styles[getStatusClass(sale.saleStatus)]}`}>
                      {sale.saleStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.status} ${styles[getStatusClass(sale.collectionStatus)]}`}>
                      {sale.collectionStatus}
                    </span>
                  </td>
                  <td>
                    <Link href={`/admin/ventas/${sale.id}`} className={styles.deleteBtn}>
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
