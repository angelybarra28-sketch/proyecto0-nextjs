'use client';

import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { AdminCatalogCategory } from '@/lib/services/adminCatalogService';
import { formatCurrency, getStatusClass } from '@/components/Admin/shared/formatters';
import {
  type AdminProductTableState,
  type AdminProductFeaturedFilter,
  type AdminProductSortDirection,
  type AdminProductSortKey,
  type AdminProductStatusFilter,
} from '@/hooks/useAdminProductTable';
import styles from '@/styles/Admin.module.css';

type AdminProductsTableProps = {
  products: AdminCatalogProduct[];
  categories: AdminCatalogCategory[];
  table: AdminProductTableState;
  isLoading: boolean;
  isReadOnly: boolean;
  onEdit: (product: AdminCatalogProduct) => void;
  onToggleStatus: (product: AdminCatalogProduct) => Promise<void>;
};

export function AdminProductsTable({ products, categories, table, isLoading, isReadOnly, onEdit, onToggleStatus }: AdminProductsTableProps) {
  return (
    <section className={styles.section}>
      <div className={styles.adminTableHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Productos</h2>
          <p className={styles.adminTableSummary}>
            Mostrando {table.pageStart}-{table.pageEnd} de {table.filteredCount} resultados ({table.totalCount} cargados)
          </p>
        </div>
        {isReadOnly && <span className={styles.adminReadonlyBadge}>Solo lectura</span>}
      </div>

      <div className={styles.adminTableToolbar}>
        <label>
          Buscar
          <input
            type="search"
            placeholder="Nombre, slug o categoría"
            value={table.search}
            onChange={(event) => table.setSearch(event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            value={table.statusFilter}
            onChange={(event) => table.setStatusFilter(event.target.value as AdminProductStatusFilter)}
          >
            <option value="all">Todos</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
        <label>
          Featured
          <select
            value={table.featuredFilter}
            onChange={(event) => table.setFeaturedFilter(event.target.value as AdminProductFeaturedFilter)}
          >
            <option value="all">Todos</option>
            <option value="featured">Sí</option>
            <option value="not-featured">No</option>
          </select>
        </label>
        <label>
          Categoría
          <select value={table.categoryId} onChange={(event) => table.setCategoryId(event.target.value)}>
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label>
          Ordenar por
          <select
            value={table.sortKey}
            onChange={(event) => table.setSortKey(event.target.value as AdminProductSortKey)}
          >
            <option value="createdAt">Creado</option>
            <option value="name">Nombre</option>
            <option value="category">Categoría</option>
            <option value="price">Precio</option>
            <option value="stock">Stock</option>
            <option value="status">Status</option>
          </select>
        </label>
        <label>
          Dirección
          <select
            value={table.sortDirection}
            onChange={(event) => table.setSortDirection(event.target.value as AdminProductSortDirection)}
          >
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
      </div>

      {isLoading ? (
        <p className={styles.empty}>Cargando productos...</p>
      ) : products.length === 0 ? (
        <p className={styles.empty}>No hay productos cargados en Supabase</p>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Cuotas</th>
                  <th>Stock</th>
                  <th>Featured</th>
                  <th>Status</th>
                  <th>Slug</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>{product.categoryName}</td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>
                      {product.installmentCount && product.installmentAmount
                        ? `${product.installmentCount}x ${formatCurrency(product.installmentAmount)}`
                        : '-'}
                    </td>
                    <td>
                      {product.stock}{' '}
                      {product.stock === 0 && <span className={styles.adminReadonlyBadge}>Sin stock</span>}
                      {product.stock > 0 && product.stock <= 5 && <span className={styles.adminReadonlyBadge}>Bajo stock</span>}
                    </td>
                    <td>{product.featured ? 'Sí' : 'No'}</td>
                    <td>
                      <span className={`${styles.status} ${styles[getStatusClass(product.status === 'ACTIVE' ? 'PAID' : 'CANCELLED')]}`}>
                        {product.status}
                      </span>
                    </td>
                    <td><code>{product.slug}</code></td>
                    <td>{product.createdAt ? new Date(product.createdAt).toLocaleDateString('es-AR') : '-'}</td>
                    <td>
                      <div className={styles.adminRowActions}>
                        <button className={styles.adminActionButton} disabled={isReadOnly} onClick={() => onEdit(product)}>Editar</button>
                        <button
                          className={styles.adminActionButton}
                          disabled={isReadOnly}
                          onClick={() => void onToggleStatus(product)}
                        >
                          {product.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.adminPagination}>
            <span>Página {table.page} de {table.totalPages}</span>
            <div className={styles.adminRowActions}>
              <button
                className={styles.adminActionButton}
                disabled={table.page === 1}
                onClick={() => table.setPage(table.page - 1)}
              >
                Anterior
              </button>
              <button
                className={styles.adminActionButton}
                disabled={table.page === table.totalPages}
                onClick={() => table.setPage(table.page + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
