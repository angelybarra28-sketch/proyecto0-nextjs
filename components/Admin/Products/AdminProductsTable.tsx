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
  onUpdateFeatured?: (productId: string, featured: boolean) => Promise<void>;
  onUpdateTendencias?: (productId: string, tendencias: boolean) => Promise<void>;
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
                className={styles.adminTableActionButton}
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

function getCategoryPathLabel(catId: string | undefined, allCats: AdminCatalogCategory[]): string {
  if (!catId) return '';
  const cat = allCats.find(c => c.id === catId);
  if (!cat) return '';
  const parts: string[] = [cat.name];
  let current = cat;
  while (current.parentId) {
    const parent = allCats.find(c => c.id === current.parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(' → ');
}

function getCategoryLabels(catIds: string[], allCats: AdminCatalogCategory[]): string[] {
  return catIds
    .map(id => getCategoryPathLabel(id, allCats))
    .filter(Boolean);
}

function categoryIdToCascade(
  catId: string | null | undefined,
  allCats: AdminCatalogCategory[]
): { madre: string; child: string; grandchild: string } {
  if (!catId) return { madre: '', child: '', grandchild: '' };
  const cat = allCats.find(c => c.id === catId);
  if (!cat) return { madre: '', child: '', grandchild: '' };
  if (!cat.parentId) return { madre: cat.id, child: '', grandchild: '' };
  const parent = allCats.find(c => c.id === cat.parentId);
  if (!parent || !parent.parentId) {
    return { madre: parent?.id ?? cat.parentId, child: cat.id, grandchild: '' };
  }
  return { madre: parent.parentId, child: parent.id, grandchild: cat.id };
}

function extractProductSizes(products: AdminCatalogProduct[]): string[] {
  const sizeSet = new Set<string>();
  DEFAULT_SIZES.forEach(s => sizeSet.add(s));
  for (const p of products) {
    if (p.size) sizeSet.add(normalizeSize(p.size));
  }
  return [...sizeSet].sort();
}

export function AdminProductsTable({ products, categories, table, isLoading, isReadOnly, onEdit, onToggleStatus, onDelete, onUpdateCategory, onUpdateInstallmentCount, onUpdateInstallmentAmount, onUpdatePrice, onMigrateImages, onUpdateFeatured, onUpdateTendencias }: AdminProductsTableProps) {
  const [pendingCascade, setPendingCascade] = useState<Record<string, { madre: string; child: string; grandchild: string }>>({});
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [pendingAmounts, setPendingAmounts] = useState<Record<string, number>>({});
  const [savingInstallment, setSavingInstallment] = useState<string | null>(null);
  const [pendingPrices, setPendingPrices] = useState<Record<string, number>>({});
  const [savingPrice, setSavingPrice] = useState<string | null>(null);
  const [savingFeatured, setSavingFeatured] = useState<Record<string, boolean>>({});
  const [savingTendencias, setSavingTendencias] = useState<Record<string, boolean>>({});
  const [filterMadre, setFilterMadre] = useState('');
  const [filterChild, setFilterChild] = useState('');
  const [filterGrandchild, setFilterGrandchild] = useState('');
  const sizes = useMemo(() => extractProductSizes(products), [products]);
  const madreCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
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
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#b8a89c' }}>Categoría</span>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={filterMadre}
              onChange={(e) => {
                const v = e.target.value;
                setFilterMadre(v);
                setFilterChild('');
                setFilterGrandchild('');
                table.setCategoryId(v);
              }}
              style={{ minWidth: 100 }}
            >
              <option value="">Todas</option>
              {madreCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {filterMadre && (() => {
              const childCats = categories.filter(c => c.parentId === filterMadre);
              return childCats.length > 0 ? (
                <select
                  value={filterChild}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilterChild(v);
                    setFilterGrandchild('');
                    table.setCategoryId(v);
                  }}
                  style={{ minWidth: 100 }}
                >
                  <option value="">Todas</option>
                  {childCats.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              ) : null;
            })()}
            {filterChild && (() => {
              const grandchildCats = categories.filter(c => c.parentId === filterChild);
              return grandchildCats.length > 0 ? (
                <select
                  value={filterGrandchild}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilterGrandchild(v);
                    table.setCategoryId(v);
                  }}
                  style={{ minWidth: 100 }}
                >
                  <option value="">Todas</option>
                  {grandchildCats.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              ) : null;
            })()}
          </div>
        </label>
        <label>
          Talle
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
            <option value="category">Categoría</option>
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
                  <th colSpan={2}>Categorías</th>
                  <th>Cant. Cuotas</th>
                  <th>Valor Cuota</th>
                  <th>Precio de venta</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Tendencias</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td colSpan={2}>
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {!isReadOnly && onUpdateCategory ? (
                          (() => {
                            const cascade = pendingCascade[product.id] ?? categoryIdToCascade(product.categoryId, categories);
                            const rowChildCats = cascade.madre ? categories.filter(c => c.parentId === cascade.madre) : [];
                            const rowGrandchildCats = cascade.child ? categories.filter(c => c.parentId === cascade.child) : [];
                            const resolvedCatId = cascade.grandchild || cascade.child || cascade.madre || '';
                            const hasChanged = resolvedCatId !== (product.categoryId ?? '');
                            return (
                              <>
                                <select
                                  value={cascade.madre}
                                  disabled={savingCategory === product.id}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setPendingCascade(prev => ({ ...prev, [product.id]: { madre: v, child: '', grandchild: '' } }));
                                  }}
                                  style={{ minWidth: 80 }}
                                >
                                  <option value="">Sin categoría</option>
                                  {madreCategories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                                {rowChildCats.length > 0 && (
                                  <select
                                    value={cascade.child}
                                    disabled={savingCategory === product.id}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setPendingCascade(prev => ({ ...prev, [product.id]: { ...prev[product.id], child: v, grandchild: '' } }));
                                    }}
                                    style={{ minWidth: 80 }}
                                  >
                                    <option value="">—</option>
                                    {rowChildCats.map((cat) => (
                                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                  </select>
                                )}
                                {rowGrandchildCats.length > 0 && (
                                  <select
                                    value={cascade.grandchild}
                                    disabled={savingCategory === product.id}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setPendingCascade(prev => ({ ...prev, [product.id]: { ...prev[product.id], grandchild: v } }));
                                    }}
                                    style={{ minWidth: 80 }}
                                  >
                                    <option value="">—</option>
                                    {rowGrandchildCats.map((cat) => (
                                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                  </select>
                                )}
                                <button
                                  className={styles.adminTableActionButton}
                                  disabled={savingCategory === product.id || !hasChanged}
                                  onClick={async () => {
                                    if (!onUpdateCategory) return;
                                    setSavingCategory(product.id);
                                    try {
                                      await onUpdateCategory(product.id, resolvedCatId);
                                    } finally {
                                      setSavingCategory(null);
                                      setPendingCascade(prev => {
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
                                {product.categoryNames && product.categoryNames.length > 1 && (
                                  <span style={{ fontSize: '0.75rem', color: '#888' }}>
                                    +{product.categoryNames.length - 1} más
                                  </span>
                                )}
                              </>
                            );
                          })()
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            {getCategoryLabels(product.categoryIds ?? [], categories).map((label, i) => (
                              <span key={i} style={{ fontSize: i > 0 ? '0.8rem' : undefined, color: i > 0 ? '#b8a89c' : undefined }}>
                                {label}
                              </span>
                            ))}
                            {(!product.categoryIds || product.categoryIds.length === 0) && (
                              <span>{product.categoryName}</span>
                            )}
                          </div>
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
                            className={styles.adminTableActionButton}
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
                            className={styles.adminTableActionButton}
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
                            className={styles.adminTableActionButton}
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
                    <td style={{ textAlign: 'center' }}>
                      {onUpdateFeatured ? (
                        <input
                          type="checkbox"
                          checked={product.featured}
                          disabled={isReadOnly || savingFeatured[product.id]}
                          onChange={async (e) => {
                            setSavingFeatured(prev => ({ ...prev, [product.id]: true }));
                            try {
                              await onUpdateFeatured(product.id, e.target.checked);
                            } finally {
                              setSavingFeatured(prev => {
                                const next = { ...prev };
                                delete next[product.id];
                                return next;
                              });
                            }
                          }}
                        />
                      ) : (
                        <span>{product.featured ? 'Sí' : 'No'}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {onUpdateTendencias ? (
                        <input
                          type="checkbox"
                          checked={product.tendencias}
                          disabled={isReadOnly || savingTendencias[product.id]}
                          onChange={async (e) => {
                            setSavingTendencias(prev => ({ ...prev, [product.id]: true }));
                            try {
                              await onUpdateTendencias(product.id, e.target.checked);
                            } finally {
                              setSavingTendencias(prev => {
                                const next = { ...prev };
                                delete next[product.id];
                                return next;
                              });
                            }
                          }}
                        />
                      ) : (
                        <span>{product.tendencias ? 'Sí' : 'No'}</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.adminRowActions}>
                        <button className={styles.adminTableActionButton} disabled={isReadOnly} onClick={() => onEdit(product)}>Editar</button>
                        <button
                          className={styles.adminTableActionButton}
                          disabled={isReadOnly}
                          onClick={() => void onToggleStatus(product)}
                        >
                          {product.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                        </button>
                        {onMigrateImages && (isExternalImageUrl(product.imageUrl) || product.carouselImages?.some(isExternalImageUrl)) && (
                          <button
                            className={styles.adminTableActionButton}
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
            <span>Página {table.page} de {table.totalPages}</span>
            <div className={styles.adminPaginationPages}>
              <button
                className={styles.adminTableActionButton}
                disabled={table.page === 1}
                onClick={() => table.setPage(table.page - 1)}
              >
                Anterior
              </button>
              {(() => {
                const total = table.totalPages;
                const current = table.page;
                const pages: (number | 'dots')[] = [];
                if (total <= 7) {
                  for (let i = 1; i <= total; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (current > 3) pages.push('dots');
                  const start = Math.max(2, current - 1);
                  const end = Math.min(total - 1, current + 1);
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (current < total - 2) pages.push('dots');
                  pages.push(total);
                }
                return pages.map((p, i) =>
                  p === 'dots' ? (
                    <span key={`dots-${i}`} className={styles.adminPaginationDots}>…</span>
                  ) : (
                    <button
                      key={p}
                      className={`${styles.adminTableActionButton} ${p === current ? styles.adminPaginationActive : ''}`}
                      onClick={() => table.setPage(p)}
                    >
                      {p}
                    </button>
                  )
                );
              })()}
              <button
                className={styles.adminTableActionButton}
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




