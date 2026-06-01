'use client';

import Link from 'next/link';
import { CollectionSummarySection } from '@/components/Admin/Collections/CollectionSummarySection';
import { AdminSalesTable } from '@/components/Admin/Sales/AdminSalesTable';
import { useAdminAccess, useAdminCollectionSummary, useAdminSales } from '@/components/Admin/useAdminData';
import { useCollectionRoute } from '@/components/Admin/useCreditAccounts';
import styles from '@/styles/Admin.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

export function AdminCollectionsPage() {
  const { isAdmin } = useAdminAccess();
  const collectionSummary = useAdminCollectionSummary(isAdmin);
  const { overdueSales, isLoadingSales, salesError } = useAdminSales(isAdmin);
  const { route, isLoading: routeLoading, error: routeError, reload: reloadRoute } = useCollectionRoute(isAdmin);

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Cobranzas</h1>
      <div className={styles.sections}>
        <CollectionSummarySection collectionSummary={collectionSummary} />

        {/* Ruta de Cobranza: Cuenta Corriente Morosos */}
        <section className={styles.section}>
          <div className={styles.adminTableHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Ruta de Cobranza (Cuenta Corriente)</h2>
              <p className={styles.adminTableSummary}>{route.length} cliente(s) con cuotas vencidas</p>
            </div>
            <button onClick={() => reloadRoute()} className={styles.adminActionButton} disabled={routeLoading}>
              {routeLoading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>

          {routeError && <div className={styles.adminAlertError}>{routeError}</div>}

          {routeLoading ? (
            <p className={styles.empty}>Cargando ruta de cobranza...</p>
          ) : route.length === 0 ? (
            <p className={styles.empty}>No hay clientes con cuotas vencidas</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Producto</th>
                    <th>Cuotas</th>
                    <th>Deuda total</th>
                    <th>Vencido</th>
                    <th>Días atraso</th>
                    <th>Primer vencimiento</th>
                    <th>Dirección</th>
                  </tr>
                </thead>
                <tbody>
                  {route.map((item) => (
                    <tr key={item.creditAccountId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.customerFullName}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{item.customerPhone || '-'}</div>
                      </td>
                      <td>{item.productName}</td>
                      <td>{item.paidInstallments} / {item.installmentCount}</td>
                      <td>{formatCurrency(item.totalDebt)}</td>
                      <td style={{ color: '#991b1b', fontWeight: 700 }}>{formatCurrency(item.overdueAmount)}</td>
                      <td style={{ color: '#991b1b', fontWeight: 700 }}>{item.daysOverdue}</td>
                      <td>{new Date(item.firstOverdueDate).toLocaleDateString('es-AR')}</td>
                      <td>{item.customerAddress || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <AdminSalesTable sales={overdueSales} isLoadingSales={isLoadingSales} salesError={salesError} />
      </div>
      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
