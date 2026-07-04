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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [featured, setFeatured] = useState(false);
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

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(catId)
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
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
        setSelectedCategoryIds([match.id]);
      }
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void onSubmit({
      categoryId: selectedCategoryIds[0] ?? null,
      categoryIds: selectedCategoryIds,
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
      imageUrl,
      carouselImages: fromImagesText(carouselImages),
    });
  };

  const madreCategories = categories.filter((category) => !category.parentId);

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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 300, overflowY: 'auto' }}>
                    {madreCategories.map((madre) => {
                      const childCats = categories.filter(c => c.parentId === madre.id);
                      const grandchildCats = childCats.length > 0
                        ? categories.filter(c => childCats.some(cc => cc.id === c.parentId))
                        : [];
                      return (
                        <div key={madre.id} style={{ marginBottom: '0.5rem' }}>
                          <label style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={selectedCategoryIds.includes(madre.id)}
                              disabled={isSaving}
                              onChange={() => toggleCategory(madre.id)}
                            />
                            {madre.name}
                          </label>
                          {childCats.length > 0 && (
                            <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              {childCats.map((cat) => (
                                <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedCategoryIds.includes(cat.id)}
                                    disabled={isSaving}
                                    onChange={() => toggleCategory(cat.id)}
                                  />
                                  {cat.name}
                                </label>
                              ))}
                            </div>
                          )}
                          {grandchildCats.length > 0 && (
                            <div style={{ marginLeft: '3rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              {grandchildCats.map((sub) => {
                                const cat = categories.find(c => c.id === sub.parentId);
                                const label = cat ? `${cat.name} → ${sub.name}` : sub.name;
                                return (
                                  <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedCategoryIds.includes(sub.id)}
                                      disabled={isSaving}
                                      onChange={() => toggleCategory(sub.id)}
                                    />
                                    {label}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
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