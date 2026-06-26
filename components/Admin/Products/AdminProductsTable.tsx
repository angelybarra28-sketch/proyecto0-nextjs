'use client';

import { useState } from 'react';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { AdminCatalogCategory } from '@/lib/services/adminCatalogService';
import { formatCurrency, getStatusClass } from '@/components/Admin/shared/formatters';
import { useMemo } from 'react';
import { normalizeSize } from '@/lib/sizeUtils';
import {
  type AdminProductTableState,
  type AdminProductSizeFilter,
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
  onDelete?: (product: AdminCatalogProduct) => void;
  onUpdateCategory?: (productId: string, categoryId: string) => Promise<void>;
  onUpdateInstallmentCount?: (productId: string, count: number) => Promise<void>;
  onUpdateInstallmentAmount?: (productId: string, amount: number) => Promise<void>;
  onUpdatePrice?: (productId: string, price: number) => Promise<void>;
  onMigrateImages?: (productId: string) => Promise<void>;
};

function DeleteButton({ product, isReadOnly, onDelete }: { product: AdminCatalogProduct; isReadOnly: boolean; onDelete?: (product: AdminCatalogProduct) => void }) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!onDelete) return null;

  return (
    <>
      <button
        className={styles.deleteBtn}
        disabled={isReadOnly}
        onClick={() => setShowConfirm(true)}
        style={{ marginLeft: 4 }}
      >
        Eliminar
      </button>
      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              background: '#1a1a2e',
              border: '1px solid #e74c3c',
              borderRadius: 8,
              padding: '1.5rem',
              maxWidth: 400,
              width: '90%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: '#e74c3c', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
              Â¿EstÃ¡s seguro que deseas eliminar este producto?
            </p>
            <p style={{ color: '#b8a89c', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {product.name}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className={styles.deleteBtn}
                onClick={() => {
                  setShowConfirm(false);
                  onDelete(product);
                }}
              >
                SÃ­, eliminar
              </button>
              <button
                className={styles.adminActionButton}
                onClick={() => setShowConfirm(false)}
              >
                No, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function isExternalImageUrl(url: string): boolean {
  return url.length > 0 && !url.includes('/storage/v1/object/public/');
}

const DEFAULT_SIZES = ['queen', 'king', '1 1/2', '2 1/2'];

function extractProductSizes(products: AdminCatalogProduct[]): string[] {
  const sizeSet = new Set<string>();
  DEFAULT_SIZES.forEach(s => sizeSet.add(s));
  for (const p of products) {
    if (p.size) sizeSet.add(normalizeSize(p.size));
  }
  return [...sizeSet].sort();
}

export function AdminProductsTable({ products, categories, table, isLoading, isReadOnly, onEdit, onToggleStatus, onDelete, onUpdateCategory, onUpdateInstallmentCount, onUpdateInstallmentAmount, onUpdatePrice, onMigrateImages }: AdminProductsTableProps) {
  const [pendingCategories, setPendingCategories] = useState<Record<string, string>>({});
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [pendingAmounts, setPendingAmounts] = useState<Record<string, number>>({});
  const [savingInstallment, setSavingInstallment] = useState<string | null>(null);
  const [pendingPrices, setPendingPrices] = useState<Record<string, number>>({});
  const [savingPrice, setSavingPrice] = useState<string | null>(null);
  const sizes = useMemo(() => extractProductSizes(products), [products]);
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
            placeholder="Nombre, slug o categorÃ­a"
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
          CategorÃ­a
          <select value={table.categoryId} onChange={(event) => table.setCategoryId(event.target.value)}>
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label>
          SubcategorÃ­a
          <select value={table.size} onChange={(event) => table.setSize(event.target.value as AdminProductSizeFilter)}>
            <option value="">Todas</option>
            {sizes.map((size) => (
              <option key={size} value={size} style={{ textTransform: 'capitalize' }}>{size}</option>
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
            <option value="category">CategorÃ­a</option>
            <option value="price">Precio</option>
            <option value="stock">Stock</option>
            <option value="status">Status</option>
          </select>
        </label>
        <label>
          DirecciÃ³n
          <select
            value={table.sortDirection}
            onChange={(event) => table.setSortDirection(event.target.value as AdminProductSortDirection)}
          >
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </select>
        </label>
        <label>
          Por pÃ¡gina
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
                  <th>CategorÃ­a</th>
                  <th>Cant. Cuotas</th>
                  <th>Valor Cuota</th>
                  <th>Precio de venta</th>
                  <th>Stock</th>
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
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        {!isReadOnly && onUpdateCategory ? (
                          <>
                            <select
                              value={pendingCategories[product.id] ?? product.categoryId ?? ''}
                              disabled={savingCategory === product.id}
                              onChange={(e) => setPendingCategories(prev => ({ ...prev, [product.id]: e.target.value }))}
                              style={{ width: 'auto', minWidth: 80 }}
                            >
                              <option value="">Sin categorÃ­a</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                            <button
                              className={styles.adminActionButton}
                              disabled={savingCategory === product.id}
                              onClick={async () => {
                                if (!onUpdateCategory) return;
                                setSavingCategory(product.id);
                                try {
                                  await onUpdateCategory(product.id, pendingCategories[product.id] ?? '');
                                } finally {
                                  setSavingCategory(null);
                                  setPendingCategories(prev => {
                                    const next = { ...prev };
                                    delete next[product.id];
                                    return next;
                                  });
                                }
                              }}
                              style={{ fontSize: '0.75rem', padding: '2px 6px', whiteSpace: 'nowrap' }}
                            >
                              {savingCategory === product.id ? '...' : '✓'}
                            </button>
                          </>
                        ) : (
                          <span>{product.categoryName}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {!isReadOnly && onUpdateInstallmentCount ? (
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <select
                            value={pendingCounts[product.id] ?? product.installmentCount ?? 8}
                            disabled={savingInstallment === product.id}
                            onChange={(e) => setPendingCounts(prev => ({ ...prev, [product.id]: Number(e.target.value) }))}
                            style={{ width: 'auto', minWidth: 60 }}
                          >
                            {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                          <button
                            className={styles.adminActionButton}
                            disabled={savingInstallment === product.id}
                            onClick={async () => {
                              if (!onUpdateInstallmentCount) return;
                              setSavingInstallment(product.id);
                              try {
                                const count = pendingCounts[product.id] ?? product.installmentCount ?? 8;
                                await onUpdateInstallmentCount(product.id, count);
                              } finally {
                                setSavingInstallment(null);
                                setPendingCounts(prev => {
                                  const next = { ...prev };
                                  delete next[product.id];
                                  return next;
                                });
                              }
                            }}
                            style={{ fontSize: '0.75rem', padding: '2px 6px', whiteSpace: 'nowrap' }}
                          >
                            {savingInstallment === product.id ? '...' : '✓'}
                          </button>
                        </div>
                      ) : (
                        <span>{product.installmentCount ?? '-'}</span>
                      )}
                    </td>
                    <td>
                      {!isReadOnly && onUpdateInstallmentAmount ? (
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={pendingAmounts[product.id] ?? product.installmentAmount ?? ''}
                            disabled={savingInstallment === product.id}
                            onChange={(e) => setPendingAmounts(prev => ({ ...prev, [product.id]: Number(e.target.value) }))}
                            style={{ width: 90 }}
                          />
                          <button
                            className={styles.adminActionButton}
                            disabled={savingInstallment === product.id}
                            onClick={async () => {
                              if (!onUpdateInstallmentAmount) return;
                              setSavingInstallment(product.id);
                              try {
                                const amount = pendingAmounts[product.id] ?? product.installmentAmount ?? 0;
                                if (amount <= 0) return;
                                await onUpdateInstallmentAmount(product.id, amount);
                              } finally {
                                setSavingInstallment(null);
                                setPendingAmounts(prev => {
                                  const next = { ...prev };
                                  delete next[product.id];
                                  return next;
                                });
                              }
                            }}
                            style={{ fontSize: '0.75rem', padding: '2px 6px', whiteSpace: 'nowrap' }}
                          >
                            {savingInstallment === product.id ? '...' : '✓'}
                          </button>
                        </div>
                      ) : (
                        <span>{product.installmentAmount ? formatCurrency(product.installmentAmount) : '-'}</span>
                      )}
                    </td>
                    <td>
                      {!isReadOnly && onUpdatePrice ? (
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={pendingPrices[product.id] ?? (product.installmentCount && product.installmentAmount ? product.installmentCount * product.installmentAmount : product.price)}
                            disabled={savingPrice === product.id}
                            onChange={(e) => setPendingPrices(prev => ({ ...prev, [product.id]: Number(e.target.value) }))}
                            style={{ width: 100 }}
                          />
                          <button
                            className={styles.adminActionButton}
                            disabled={savingPrice === product.id}
                            onClick={async () => {
                              if (!onUpdatePrice) return;
                              setSavingPrice(product.id);
                              try {
                                const newPrice = pendingPrices[product.id] ?? (product.installmentCount && product.installmentAmount ? product.installmentCount * product.installmentAmount : product.price);
                                if (newPrice <= 0) return;
                                await onUpdatePrice(product.id, newPrice);
                              } finally {
                                setSavingPrice(null);
                                setPendingPrices(prev => {
                                  const next = { ...prev };
                                  delete next[product.id];
                                  return next;
                                });
                              }
                            }}
                            style={{ fontSize: '0.75rem', padding: '2px 6px', whiteSpace: 'nowrap' }}
                          >
                            {savingPrice === product.id ? '...' : '✓'}
                          </button>
                        </div>
                      ) : (
                        <span>{formatCurrency(product.installmentCount && product.installmentAmount ? product.installmentCount * product.installmentAmount : product.price)}</span>
                      )}
                    </td>
                    <td>
                      {product.stock}{' '}
                      {product.stock === 0 && <span className={styles.adminReadonlyBadge}>Sin stock</span>}
                      {product.stock > 0 && product.stock <= 5 && <span className={styles.adminReadonlyBadge}>Bajo stock</span>}
                    </td>
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
                        {onMigrateImages && (isExternalImageUrl(product.imageUrl) || product.carouselImages?.some(isExternalImageUrl)) && (
                          <button
                            className={styles.adminActionButton}
                            onClick={() => void onMigrateImages(product.id)}
                            title="Descargar imÃ¡genes externas a almacenamiento local"
                          >
                            ðŸ“¥ ImÃ¡genes
                          </button>
                        )}
                        <DeleteButton product={product} isReadOnly={isReadOnly} onDelete={onDelete} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.adminPagination}>
            <span>PÃ¡gina {table.page} de {table.totalPages}</span>
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




