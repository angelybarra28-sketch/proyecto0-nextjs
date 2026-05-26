import Link from 'next/link';
import type { AdminSaleSummary } from '@/lib/supabase/types';
import type { AdminPagination } from '@/lib/services/admin/types';
import { formatCurrency, getStatusClass } from '@/components/Admin/shared/formatters';
import {
  type AdminCollectionStatusFilter,
  type AdminSaleSortDirection,
  type AdminSaleSortKey,
  type AdminSalesTableState,
  type AdminSaleStatusFilter,
} from '@/hooks/useAdminSalesTable';
import styles from '@/styles/Admin.module.css';

type AdminSalesTableProps = {
  sales: AdminSaleSummary[];
  table?: AdminSalesTableState;
  pagination?: AdminPagination | null;
  isLoadingSales: boolean;
  salesError: string;
};

export function AdminSalesTable({ sales, table, pagination, isLoadingSales, salesError }: AdminSalesTableProps) {
  const page = pagination?.page ?? table?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  const total = pagination?.total ?? sales.length;
  const pageStart = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const pageEnd = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : sales.length;

  return (
    <section className={styles.section}>
      <div className={styles.adminTableHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Ventas Realizadas</h2>
          <p className={styles.adminTableSummary}>Mostrando {pageStart}-{pageEnd} de {total} ventas</p>
        </div>
      </div>

      {table && <div className={styles.adminTableToolbar}>
        <label>
          Buscar
          <input type="search" placeholder="Cliente o número" value={table.search} onChange={(event) => table.setSearch(event.target.value)} />
        </label>
        <label>
          Venta
          <select value={table.saleStatus} onChange={(event) => table.setSaleStatus(event.target.value as AdminSaleStatusFilter)}>
            <option value="all">Todas</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </label>
        <label>
          Cobranza
          <select value={table.collectionStatus} onChange={(event) => table.setCollectionStatus(event.target.value as AdminCollectionStatusFilter)}>
            <option value="all">Todas</option>
            <option value="PENDING">PENDING</option>
            <option value="UP_TO_DATE">UP_TO_DATE</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="PAID">PAID</option>
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={table.dateFrom} onChange={(event) => table.setDateFrom(event.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={table.dateTo} onChange={(event) => table.setDateTo(event.target.value)} />
        </label>
        <label>
          Ordenar por
          <select value={table.sortKey} onChange={(event) => table.setSortKey(event.target.value as AdminSaleSortKey)}>
            <option value="saleDate">Fecha</option>
            <option value="saleNumber">Número</option>
            <option value="total">Total</option>
            <option value="saleStatus">Venta</option>
            <option value="collectionStatus">Cobranza</option>
          </select>
        </label>
        <label>
          Dirección
          <select value={table.sortDirection} onChange={(event) => table.setSortDirection(event.target.value as AdminSaleSortDirection)}>
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </select>
        </label>
        <label>
          Por página
          <select value={table.pageSize} onChange={(event) => table.setPageSize(Number(event.target.value))}>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </label>
      </div>}

      {isLoadingSales && <p className={styles.empty}>Cargando ventas...</p>}

      {salesError && <p className={styles.empty}>{salesError}</p>}

      {!isLoadingSales && !salesError && sales.length === 0 ? (
        <p className={styles.empty}>No hay ventas registradas en Supabase</p>
      ) : !isLoadingSales && !salesError ? (
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
      ) : null}

      {table && !isLoadingSales && !salesError && sales.length > 0 && (
        <div className={styles.adminPagination}>
          <span>Página {page} de {totalPages}</span>
          <div className={styles.adminRowActions}>
            <button className={styles.adminActionButton} disabled={page === 1} onClick={() => table.setPage(page - 1)}>Anterior</button>
            <button className={styles.adminActionButton} disabled={page === totalPages} onClick={() => table.setPage(page + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </section>
  );
}
