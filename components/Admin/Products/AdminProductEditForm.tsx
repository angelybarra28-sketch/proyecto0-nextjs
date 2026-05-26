'use client';

import { useState } from 'react';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { AdminCatalogCategory, AdminProductPayload } from '@/lib/services/adminCatalogService';
import { deleteAdminProductImage, uploadAdminProductImage } from '@/lib/services/admin/client';
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
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState('');

  const currentCarouselImages = fromImagesText(carouselImages);
  const controlsDisabled = isSaving || isUploading;

  const handleUploadMainImage = async (file: File | undefined) => {
    if (!file) return;

    setIsUploading(true);
    setImageError('');

    try {
      const image = await uploadAdminProductImage(product.id, file);
      setImageUrl(image.url);
    } catch (uploadError) {
      console.error('Error uploading main product image:', uploadError);
      setImageError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen principal');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadCarouselImages = async (files: FileList | null) => {
    if (!files?.length) return;

    setIsUploading(true);
    setImageError('');

    try {
      const uploadedImages = await Promise.all(
        Array.from(files).map((file) => uploadAdminProductImage(product.id, file))
      );
      setCarouselImages(toImagesText([...currentCarouselImages, ...uploadedImages.map((image) => image.url)]));
    } catch (uploadError) {
      console.error('Error uploading carousel product images:', uploadError);
      setImageError(uploadError instanceof Error ? uploadError.message : 'No se pudieron subir las imágenes');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (url: string, onRemove: () => void) => {
    setIsUploading(true);
    setImageError('');

    try {
      await deleteAdminProductImage(url);
      onRemove();
    } catch (deleteError) {
      console.error('Error deleting product image:', deleteError);
      setImageError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la imagen');
    } finally {
      setIsUploading(false);
    }
  };

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
            carouselImages: currentCarouselImages,
          });
        }}
      >
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              <tr>
                <td>Nombre</td>
                <td><input value={name} disabled={controlsDisabled} onChange={(event) => setName(event.target.value)} required /></td>
              </tr>
              <tr>
                <td>Slug</td>
                <td><input value={slug} disabled={controlsDisabled} onChange={(event) => setSlug(event.target.value)} required /></td>
              </tr>
              <tr>
                <td>Precio</td>
                <td><input type="number" min="0" step="0.01" value={price} disabled={controlsDisabled} onChange={(event) => setPrice(event.target.value)} required /></td>
              </tr>
              <tr>
                <td>Stock</td>
                <td><input type="number" min="0" step="1" value={stock} disabled={controlsDisabled} onChange={(event) => setStock(event.target.value)} required /></td>
              </tr>
              <tr>
                <td>Categoría</td>
                <td>
                  <select value={categoryId} disabled={controlsDisabled} onChange={(event) => setCategoryId(event.target.value)}>
                    <option value="">Sin categoría</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td>Featured</td>
                <td><input type="checkbox" checked={featured} disabled={controlsDisabled} onChange={(event) => setFeatured(event.target.checked)} /></td>
              </tr>
              <tr>
                <td>Status</td>
                <td>
                  <select value={status} disabled={controlsDisabled} onChange={(event) => setStatus(event.target.value as AdminProductPayload['status'])}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td>Descripción corta</td>
                <td><textarea value={description} disabled={controlsDisabled} onChange={(event) => setDescription(event.target.value)} /></td>
              </tr>
              <tr>
                <td>Imagen principal</td>
                <td>
                  <input value={imageUrl} disabled={controlsDisabled} onChange={(event) => setImageUrl(event.target.value)} />
                  <div className={styles.imageUploadControls}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={controlsDisabled}
                      onChange={(event) => {
                        void handleUploadMainImage(event.target.files?.[0]);
                        event.target.value = '';
                      }}
                    />
                  </div>
                  {imageUrl && (
                    <div className={styles.imagePreviewList}>
                      <div className={styles.imagePreviewItem}>
                        <div
                          className={styles.imagePreviewThumb}
                          role="img"
                          aria-label={`Imagen principal de ${name}`}
                          style={{ backgroundImage: `url(${imageUrl})` }}
                        />
                        <button
                          className={styles.deleteBtn}
                          type="button"
                          disabled={controlsDisabled}
                          onClick={() => void handleRemoveImage(imageUrl, () => setImageUrl(''))}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <td>Imágenes existentes</td>
                <td>
                  <textarea value={carouselImages} disabled={controlsDisabled} onChange={(event) => setCarouselImages(event.target.value)} />
                  <div className={styles.imageUploadControls}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      disabled={controlsDisabled}
                      onChange={(event) => {
                        void handleUploadCarouselImages(event.target.files);
                        event.target.value = '';
                      }}
                    />
                  </div>
                  {currentCarouselImages.length > 0 && (
                    <div className={styles.imagePreviewList}>
                      {currentCarouselImages.map((url) => (
                        <div className={styles.imagePreviewItem} key={url}>
                          <div
                            className={styles.imagePreviewThumb}
                            role="img"
                            aria-label={`Imagen adicional de ${name}`}
                            style={{ backgroundImage: `url(${url})` }}
                          />
                          <button
                            className={styles.deleteBtn}
                            type="button"
                            disabled={controlsDisabled}
                            onClick={() => void handleRemoveImage(
                              url,
                              () => setCarouselImages(toImagesText(currentCarouselImages.filter((image) => image !== url)))
                            )}
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {imageError && <p className={styles.empty}>{imageError}</p>}
        {isUploading && <p className={styles.empty}>Procesando imagen...</p>}

        <div className={styles.backLink}>
          <button className={styles.deleteBtn} type="submit" disabled={controlsDisabled}>{isSaving ? 'Guardando...' : 'Guardar cambios'}</button>{' '}
          <button className={styles.deleteBtn} type="button" disabled={controlsDisabled} onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </section>
  );
}
