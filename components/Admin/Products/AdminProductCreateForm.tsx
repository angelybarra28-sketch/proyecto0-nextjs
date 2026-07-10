'use client';

import { useState } from 'react';
import type { AdminCatalogCategory } from '@/lib/services/adminCatalogService';
import type { AdminProductPayload } from '@/lib/services/adminCatalogService';
import { ProductUrlImporter, type ImportedProductData } from '@/components/Admin/Products/ProductUrlImporter';
import styles from '@/styles/Admin.module.css';

type AdminProductCreateFormProps = {
  categories: AdminCatalogCategory[];
  isSaving: boolean;
  onSubmit: (payload: AdminProductPayload) => Promise<void>;
  onCancel: () => void;
};

function toImagesText(images: string[]): string {
  return images.join('\n');
}

function fromImagesText(value: string): string[] {
  return value
    .split('\n')
    .map((image) => image.trim())
    .filter(Boolean);
}

const CUOTA_OPTIONS = [4, 8, 10, 12];

function calculateValorCuota(precio: number, cuotas: number): string {
  if (cuotas > 0 && precio > 0) {
    return (precio / cuotas).toString();
  }
  return '';
}

export function AdminProductCreateForm({
  categories,
  isSaving,
  onSubmit,
  onCancel,
}: AdminProductCreateFormProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [installmentCount, setInstallmentCount] = useState('8');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [cascadeMadre, setCascadeMadre] = useState<string>('');
  const [cascadeChild, setCascadeChild] = useState<string>('');
  const [cascadeGrandchild, setCascadeGrandchild] = useState<string>('');
  const [cascadeMadre2, setCascadeMadre2] = useState<string>('');
  const [cascadeChild2, setCascadeChild2] = useState<string>('');
  const [cascadeGrandchild2, setCascadeGrandchild2] = useState<string>('');
  const [showSecondCascade, setShowSecondCascade] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [tendencias, setTendencias] = useState(false);
  const [status, setStatus] = useState<AdminProductPayload['status']>('ACTIVE');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [carouselImages, setCarouselImages] = useState('');
  const [referencePrice, setReferencePrice] = useState('');

  const recalculateValorCuota = (precio: string, cuotas: string) => {
    const p = parseFloat(precio);
    const c = parseInt(cuotas, 10);
    setInstallmentAmount(calculateValorCuota(p, c));
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    recalculateValorCuota(value, installmentCount);
  };

  const handleInstallmentCountChange = (value: string) => {
    setInstallmentCount(value);
    recalculateValorCuota(price, value);
  };

  const handleInstallmentAmountChange = (value: string) => {
    setInstallmentAmount(value);
    const c = parseInt(installmentCount, 10);
    const cuota = parseFloat(value);
    if (c > 0 && cuota > 0) {
      setPrice((c * cuota).toString());
    }
  };

  const handleReferencePriceChange = (value: string) => {
    setReferencePrice(value);
    const ref = parseFloat(value);
    if (ref > 0) {
      const nuevoPrecio = (ref * 3).toString();
      setPrice(nuevoPrecio);
      recalculateValorCuota(nuevoPrecio, installmentCount);
    }
  };

  function normalizeMatch(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function findCategoryByName(name: string): AdminCatalogCategory | undefined {
    const normalized = normalizeMatch(name);
    return categories.find(c => normalizeMatch(c.name) === normalized);
  }

  const handleImport = (data: ImportedProductData) => {
    setName(data.name);
    setSlug(data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .substring(0, 100)
    );
    setDescription(data.description);
    setImageUrl(data.images[0] || '');
    setCarouselImages(data.images.join('\n'));
    if (data.referencePrice) {
      setReferencePrice(data.referencePrice.toString());
      const nuevoPrecio = (data.referencePrice * 3).toString();
      setPrice(nuevoPrecio);
      recalculateValorCuota(nuevoPrecio, installmentCount);
    }
    if (data.categoryName) {
      const match = findCategoryByName(data.categoryName);
      if (match) {
        if (!match.parentId) {
          setCascadeMadre(match.id);
        } else {
          const parent = categories.find(c => c.id === match.parentId);
          if (parent && !parent.parentId) {
            setCascadeMadre(parent.id);
            setCascadeChild(match.id);
          } else if (parent) {
            const grandparent = categories.find(c => c.id === parent.parentId);
            if (grandparent && !grandparent.parentId) {
              setCascadeMadre(grandparent.id);
              setCascadeChild(parent.id);
              setCascadeGrandchild(match.id);
            }
          }
        }
      }
    }
  };

  const madreCategories = categories.filter((category) => !category.parentId);

  const childCategories = cascadeMadre
    ? categories.filter(c => c.parentId === cascadeMadre)
    : [];

  const grandchildCategories = cascadeChild
    ? categories.filter(c => c.parentId === cascadeChild)
    : [];

  const resolvedPrimary: string | null = (() => {
    if (cascadeGrandchild) return cascadeGrandchild;
    if (cascadeChild) return cascadeChild;
    if (cascadeMadre) return cascadeMadre;
    return null;
  })();

  const resolvedSecondary: string | null = (() => {
    if (cascadeGrandchild2) return cascadeGrandchild2;
    if (cascadeChild2) return cascadeChild2;
    if (cascadeMadre2) return cascadeMadre2;
    return null;
  })();

  const resolvedCategoryIds: string[] = [resolvedPrimary, resolvedSecondary].filter((id): id is string => id !== null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void onSubmit({
      categoryId: resolvedCategoryIds[0] ?? null,
      categoryIds: resolvedCategoryIds,
      name,
      slug,
      description,
      price: Number(price),
      compareAtPrice: null,
      discountLabel: '',
      referencePrice: referencePrice ? Number(referencePrice) : null,
      installmentCount: installmentCount ? parseInt(installmentCount, 10) : null,
      installmentAmount: installmentAmount ? parseFloat(installmentAmount) : null,
      stock: Number(stock),
      status,
      featured,
      tendencias,
      imageUrl,
      carouselImages: fromImagesText(carouselImages),
    });
  };

  const handleCascadeMadre = (value: string) => {
    setCascadeMadre(value);
    setCascadeChild('');
    setCascadeGrandchild('');
  };

  const handleCascadeChild = (value: string) => {
    setCascadeChild(value);
    setCascadeGrandchild('');
  };

  const handleCascadeMadre2 = (value: string) => {
    setCascadeMadre2(value);
    setCascadeChild2('');
    setCascadeGrandchild2('');
  };

  const handleCascadeChild2 = (value: string) => {
    setCascadeChild2(value);
    setCascadeGrandchild2('');
  };

  const handleToggleSecondCascade = () => {
    if (showSecondCascade) {
      setCascadeMadre2('');
      setCascadeChild2('');
      setCascadeGrandchild2('');
    }
    setShowSecondCascade((prev) => !prev);
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Crear Producto Nuevo</h2>

      <ProductUrlImporter onImport={handleImport} />

      <form onSubmit={handleSubmit}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              <tr>
                <td>Nombre</td>
                <td>
                  <input
                    value={name}
                    disabled={isSaving}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </td>
              </tr>
              <tr>
                <td>Slug</td>
                <td>
                  <input
                    value={slug}
                    disabled={isSaving}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </td>
              </tr>
              <tr>
                <td>Precio de referencia</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={referencePrice}
                    disabled={isSaving}
                    onChange={(e) => handleReferencePriceChange(e.target.value)}
                    placeholder="Precio del proveedor"
                  />
                  <small style={{ display: 'block', color: '#888', marginTop: '0.25rem' }}>
                    Precio original del proveedor. Solo visible en el admin.
                  </small>
                </td>
              </tr>
              <tr>
                <td>Precio de venta</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    disabled={isSaving}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    required
                  />
                  <small style={{ display: 'block', color: '#888', marginTop: '0.25rem' }}>
                    Precio sugerido: ref × 3. Podés modificarlo manualmente.
                  </small>
                </td>
              </tr>
              <tr>
                <td>Cuotas</td>
                <td>
                  <select
                    value={installmentCount}
                    disabled={isSaving}
                    onChange={(e) => handleInstallmentCountChange(e.target.value)}
                    required
                    style={{ width: '80px', marginRight: '0.5rem' }}
                  >
                    {CUOTA_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <span style={{ color: '#888' }}>cuotas de $</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={installmentAmount}
                    disabled={isSaving}
                    onChange={(e) => handleInstallmentAmountChange(e.target.value)}
                    style={{ width: '120px', marginLeft: '0.5rem' }}
                  />
                  <small style={{ display: 'block', color: '#888', marginTop: '0.25rem' }}>
                    Precio = cuotas × valor cuota. Podés editar cualquiera de los dos.
                  </small>
                </td>
              </tr>
              <tr>
                <td>Stock</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stock}
                    disabled={isSaving}
                    onChange={(e) => setStock(e.target.value)}
                    required
                  />
                </td>
              </tr>
              <tr>
                <td style={{ verticalAlign: 'top' }}>Categorías</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', color: '#b8a89c', fontSize: '0.85rem' }}>
                        Categoría principal
                      </label>
                      <select
                        value={cascadeMadre}
                        disabled={isSaving}
                        onChange={(e) => handleCascadeMadre(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="">— Seleccionar —</option>
                        {madreCategories.map((madre) => (
                          <option key={madre.id} value={madre.id}>{madre.name}</option>
                        ))}
                      </select>
                    </div>
                    {childCategories.length > 0 && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', color: '#b8a89c', fontSize: '0.85rem' }}>
                          Subcategoría
                        </label>
                        <select
                          value={cascadeChild}
                          disabled={isSaving}
                          onChange={(e) => handleCascadeChild(e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="">— Ninguna (solo categoría principal) —</option>
                          {childCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {grandchildCategories.length > 0 && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', color: '#b8a89c', fontSize: '0.85rem' }}>
                          Subcategoría específica
                        </label>
                        <select
                          value={cascadeGrandchild}
                          disabled={isSaving}
                          onChange={(e) => setCascadeGrandchild(e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="">— Ninguna —</option>
                          {grandchildCategories.map((sub) => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {resolvedPrimary && (
                      <div style={{ fontSize: '0.85rem', color: '#c8a87c', marginTop: '0.25rem' }}>
                        ✓ Seleccionado: {categories.find(c => c.id === resolvedPrimary)?.name ?? resolvedPrimary}
                      </div>
                    )}

                    {!showSecondCascade && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleToggleSecondCascade}
                        style={{
                          background: 'none',
                          border: '1px dashed #b8a89c',
                          borderRadius: '4px',
                          padding: '0.5rem',
                          cursor: 'pointer',
                          color: '#b8a89c',
                          fontSize: '0.85rem',
                          marginTop: '0.25rem',
                        }}
                      >
                        + Agregar otra categoría
                      </button>
                    )}

                    {showSecondCascade && (
                      <>
                        <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '0.25rem 0' }} />
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.25rem', color: '#b8a89c', fontSize: '0.85rem' }}>
                            Categoría secundaria (opcional)
                          </label>
                          <select
                            value={cascadeMadre2}
                            disabled={isSaving}
                            onChange={(e) => handleCascadeMadre2(e.target.value)}
                            style={{ width: '100%' }}
                          >
                            <option value="">— Seleccionar —</option>
                            {madreCategories.map((madre) => (
                              <option key={madre.id} value={madre.id}>{madre.name}</option>
                            ))}
                          </select>
                        </div>
                        {(() => {
                          const childCats2 = cascadeMadre2
                            ? categories.filter(c => c.parentId === cascadeMadre2)
                            : [];
                          return childCats2.length > 0 && (
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.25rem', color: '#b8a89c', fontSize: '0.85rem' }}>
                                Subcategoría
                              </label>
                              <select
                                value={cascadeChild2}
                                disabled={isSaving}
                                onChange={(e) => handleCascadeChild2(e.target.value)}
                                style={{ width: '100%' }}
                              >
                                <option value="">— Ninguna (solo categoría principal) —</option>
                                {childCats2.map((cat) => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}
                        {(() => {
                          const grandchildCats2 = cascadeChild2
                            ? categories.filter(c => c.parentId === cascadeChild2)
                            : [];
                          return grandchildCats2.length > 0 && (
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.25rem', color: '#b8a89c', fontSize: '0.85rem' }}>
                                Subcategoría específica
                              </label>
                              <select
                                value={cascadeGrandchild2}
                                disabled={isSaving}
                                onChange={(e) => setCascadeGrandchild2(e.target.value)}
                                style={{ width: '100%' }}
                              >
                                <option value="">— Ninguna —</option>
                                {grandchildCats2.map((sub) => (
                                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}
                        {resolvedSecondary && (
                          <div style={{ fontSize: '0.85rem', color: '#c8a87c', marginTop: '0.25rem' }}>
                            ✓ Seleccionado: {categories.find(c => c.id === resolvedSecondary)?.name ?? resolvedSecondary}
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={handleToggleSecondCascade}
                          style={{
                            background: 'none',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            padding: '0.4rem',
                            cursor: 'pointer',
                            color: '#e07070',
                            fontSize: '0.85rem',
                            marginTop: '0.25rem',
                          }}
                        >
                          − Quitar categoría secundaria
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              <tr>
                <td>Destacado</td>
                <td>
                  <input
                    type="checkbox"
                    checked={featured}
                    disabled={isSaving}
                    onChange={(e) => setFeatured(e.target.checked)}
                  />
                </td>
              </tr>
              <tr>
                <td>Tendencias</td>
                <td>
                  <input
                    type="checkbox"
                    checked={tendencias}
                    disabled={isSaving}
                    onChange={(e) => setTendencias(e.target.checked)}
                  />
                </td>
              </tr>
              <tr>
                <td>Estado</td>
                <td>
                  <select
                    value={status}
                    disabled={isSaving}
                    onChange={(e) => setStatus(e.target.value as AdminProductPayload['status'])}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                    <option value="OUT_OF_STOCK">Sin stock</option>
                    <option value="ARCHIVED">Archivado</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td>Descripción</td>
                <td>
                  <textarea
                    value={description}
                    disabled={isSaving}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </td>
              </tr>
              <tr>
                <td>Imagen principal</td>
                <td>
                  <input
                    value={imageUrl}
                    disabled={isSaving}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="URL de la imagen"
                  />
                  {imageUrl && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <img
                        src={imageUrl}
                        alt="Preview"
                        style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '4px' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <td>Imágenes del carrusel</td>
                <td>
                  <textarea
                    value={carouselImages}
                    disabled={isSaving}
                    onChange={(e) => setCarouselImages(e.target.value)}
                    rows={4}
                    placeholder="Una URL por línea"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={styles.backLink} style={{ marginTop: '1rem' }}>
          <button className={styles.deleteBtn} type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Crear producto'}
          </button>{' '}
          <button className={styles.deleteBtn} type="button" disabled={isSaving} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}