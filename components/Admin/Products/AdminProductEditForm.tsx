'use client';

import { useState } from 'react';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { AdminCatalogCategory, AdminProductPayload } from '@/lib/services/adminCatalogService';
import styles from '@/styles/Admin.module.css';

type AdminProductEditFormProps = {
  product: AdminCatalogProduct;
  categories: AdminCatalogCategory[];
  isSaving: boolean;
  onSubmit: (productId: string, payload: AdminProductPayload) => Promise<void>;
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

export function AdminProductEditForm({
  product,
  categories,
  isSaving,
  onSubmit,
  onCancel,
}: AdminProductEditFormProps) {
  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [price, setPrice] = useState(product.price.toString());
  const [stock, setStock] = useState(product.stock.toString());
  const [categoryId, setCategoryId] = useState(product.categoryId ?? '');
  const [featured, setFeatured] = useState(product.featured);
  const [status, setStatus] = useState<AdminProductPayload['status']>(product.status);
  const [description, setDescription] = useState(product.description);
  const [imageUrl, setImageUrl] = useState(product.imageUrl);
  const [carouselImages, setCarouselImages] = useState(toImagesText(product.carouselImages));

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Editar Producto</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(product.id, {
            categoryId: categoryId || null,
            name,
            slug,
            description,
            price: Number(price),
            compareAtPrice: product.compareAtPrice,
            discountLabel: product.discountLabel,
            stock: Number(stock),
            status,
            featured,
            imageUrl,
            carouselImages: fromImagesText(carouselImages),
          });
        }}
      >
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              <tr>
                <td>Nombre</td>
                <td><input value={name} disabled={isSaving} onChange={(event) => setName(event.target.value)} required /></td>
              </tr>
              <tr>
                <td>Slug</td>
                <td><input value={slug} disabled={isSaving} onChange={(event) => setSlug(event.target.value)} required /></td>
              </tr>
              <tr>
                <td>Precio</td>
                <td><input type="number" min="0" step="0.01" value={price} disabled={isSaving} onChange={(event) => setPrice(event.target.value)} required /></td>
              </tr>
              <tr>
                <td>Stock</td>
                <td><input type="number" min="0" step="1" value={stock} disabled={isSaving} onChange={(event) => setStock(event.target.value)} required /></td>
              </tr>
              <tr>
                <td>Categoría</td>
                <td>
                  <select value={categoryId} disabled={isSaving} onChange={(event) => setCategoryId(event.target.value)}>
                    <option value="">Sin categoría</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td>Featured</td>
                <td><input type="checkbox" checked={featured} disabled={isSaving} onChange={(event) => setFeatured(event.target.checked)} /></td>
              </tr>
              <tr>
                <td>Status</td>
                <td>
                  <select value={status} disabled={isSaving} onChange={(event) => setStatus(event.target.value as AdminProductPayload['status'])}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td>Descripción corta</td>
                <td><textarea value={description} disabled={isSaving} onChange={(event) => setDescription(event.target.value)} /></td>
              </tr>
              <tr>
                <td>Imagen principal</td>
                <td><input value={imageUrl} disabled={isSaving} onChange={(event) => setImageUrl(event.target.value)} /></td>
              </tr>
              <tr>
                <td>Imágenes existentes</td>
                <td><textarea value={carouselImages} disabled={isSaving} onChange={(event) => setCarouselImages(event.target.value)} /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={styles.backLink}>
          <button className={styles.deleteBtn} type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar cambios'}</button>{' '}
          <button className={styles.deleteBtn} type="button" disabled={isSaving} onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </section>
  );
}
