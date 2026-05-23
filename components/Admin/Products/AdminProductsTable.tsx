'use client';

import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import { formatCurrency, getStatusClass } from '@/components/Admin/shared/formatters';
import styles from '@/styles/Admin.module.css';

type AdminProductsTableProps = {
  products: AdminCatalogProduct[];
  isReadOnly: boolean;
  onEdit: (product: AdminCatalogProduct) => void;
  onToggleStatus: (product: AdminCatalogProduct) => Promise<void>;
};

export function AdminProductsTable({ products, isReadOnly, onEdit, onToggleStatus }: AdminProductsTableProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Productos ({products.length})</h2>

      {products.length === 0 ? (
        <p className={styles.empty}>No hay productos cargados en Supabase</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
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
                  <td>{product.name}</td>
                  <td>{product.categoryName}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>{product.stock}</td>
                  <td>{product.featured ? 'Sí' : 'No'}</td>
                  <td>
                    <span className={`${styles.status} ${styles[getStatusClass(product.status === 'ACTIVE' ? 'PAID' : 'CANCELLED')]}`}>
                      {product.status}
                    </span>
                  </td>
                  <td>{product.slug}</td>
                  <td>{product.createdAt ? new Date(product.createdAt).toLocaleDateString('es-AR') : '-'}</td>
                  <td>
                    <button className={styles.deleteBtn} disabled={isReadOnly} onClick={() => onEdit(product)}>Editar</button>{' '}
                    <button
                      className={styles.deleteBtn}
                      disabled={isReadOnly}
                      onClick={() => void onToggleStatus(product)}
                    >
                      {product.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                    </button>
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
