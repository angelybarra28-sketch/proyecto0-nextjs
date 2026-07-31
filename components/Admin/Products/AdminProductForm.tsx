'use client';

import { useState } from 'react';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { AdminCatalogCategory, AdminProductPayload } from '@/lib/services/adminCatalogService';
import styles from '@/styles/Admin.module.css';
import { useProductForm } from './hooks/useProductForm';
import { CreateExtras } from './subcomponents/CreateExtras';
import { BasicInfo } from './subcomponents/BasicInfo';
import { Pricing } from './subcomponents/Pricing';
import { Categories } from './subcomponents/Categories';
import { Stock } from './subcomponents/Stock';
import { Status } from './subcomponents/Status';
import { PriceHistoryTab } from './subcomponents/PriceHistoryTab';

type AdminProductFormProps = {
  mode: 'create' | 'edit';
  product?: AdminCatalogProduct;
  categories: AdminCatalogCategory[];
  isSaving: boolean;
  onSubmit: (productId: string | null, payload: AdminProductPayload) => Promise<void>;
  onCancel: () => void;
};

export function AdminProductForm({ mode, product, categories, isSaving, onSubmit, onCancel }: AdminProductFormProps) {
  const form = useProductForm({ mode, product, categories, isSaving, onSubmit, onCancel });
  const { isCreate, cascade, pricing } = form;
  const [activeTab, setActiveTab] = useState<'datos' | 'historial'>('datos');

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    background: active ? '#4a433a' : 'transparent',
    color: active ? '#f5f2ec' : '#f7c59f',
    borderBottom: active ? '2px solid #f7c59f' : '2px solid transparent',
  });

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{form.title}</h2>

      {isCreate && <CreateExtras onImport={form.handleImport} />}

      {!isCreate && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem' }}>
          <button type="button" style={tabButtonStyle(activeTab === 'datos')} onClick={() => setActiveTab('datos')}>
            Datos del producto
          </button>
          <button
            type="button"
            style={tabButtonStyle(activeTab === 'historial')}
            onClick={() => setActiveTab('historial')}
          >
            Historial de precios
          </button>
        </div>
      )}

      {activeTab === 'historial' && product ? (
        <PriceHistoryTab productId={product.id} />
      ) : (
        <form onSubmit={form.handleSubmit}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              <BasicInfo
                name={form.name}
                slug={form.slug}
                disabled={form.controlsDisabled}
                onNameChange={form.handleNameChange}
                onSlugChange={form.setSlug}
                onSlugManuallyEdit={isCreate ? () => form.setSlugManuallyEdited(true) : undefined}
              />

              <Pricing
                price={pricing.price}
                referencePrice={pricing.referencePrice}
                installmentCount={pricing.installmentCount}
                installmentAmount={pricing.installmentAmount}
                priceChangeReason={form.priceChangeReason}
                disabled={form.controlsDisabled}
                isCreate={isCreate}
                onPriceChange={pricing.handlePriceChange}
                onReferencePriceChange={pricing.handleReferencePriceChange}
                onInstallmentCountChange={pricing.handleInstallmentCountChange}
                onInstallmentAmountChange={pricing.handleInstallmentAmountChange}
                onPriceChangeReasonChange={form.setPriceChangeReason}
              />

              <Stock stock={form.stock} disabled={form.controlsDisabled} onChange={form.setStock} />

              <Categories
                categories={categories}
                cascadeMadre={cascade.cascadeMadre}
                cascadeChild={cascade.cascadeChild}
                cascadeGrandchild={cascade.cascadeGrandchild}
                cascadeMadre2={cascade.cascadeMadre2}
                cascadeChild2={cascade.cascadeChild2}
                cascadeGrandchild2={cascade.cascadeGrandchild2}
                showSecondCascade={cascade.showSecondCascade}
                madreCategories={cascade.madreCategories}
                childCategories={cascade.childCategories}
                grandchildCategories={cascade.grandchildCategories}
                childCats2={cascade.childCats2}
                grandchildCats2={cascade.grandchildCats2}
                resolvedPrimary={cascade.resolvedPrimary}
                resolvedSecondary={cascade.resolvedSecondary}
                disabled={form.controlsDisabled}
                isCreate={isCreate}
                onCascadeMadre={cascade.handleCascadeMadre}
                onCascadeChild={cascade.handleCascadeChild}
                onCascadeGrandchild={cascade.setCascadeGrandchild}
                onCascadeMadre2={cascade.handleCascadeMadre2}
                onCascadeChild2={cascade.handleCascadeChild2}
                onCascadeGrandchild2={cascade.setCascadeGrandchild2}
                onToggleSecondCascade={cascade.handleToggleSecondCascade}
              />

              <tr>
                <td>{isCreate ? 'Destacado' : 'Featured'}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={form.featured}
                    disabled={form.controlsDisabled}
                    onChange={(e) => form.setFeatured(e.target.checked)}
                  />
                </td>
              </tr>
              <tr>
                <td>OFERTAS</td>
                <td>
                  <input
                    type="checkbox"
                    checked={form.tendencias}
                    disabled={form.controlsDisabled}
                    onChange={(e) => form.setTendencias(e.target.checked)}
                  />
                </td>
              </tr>

              <Status status={form.status} disabled={form.controlsDisabled} isCreate={isCreate} onChange={form.setStatus} />

              <tr>
                <td>{isCreate ? 'Descripción' : 'Descripción corta'}</td>
                <td>
                  <textarea
                    value={form.description}
                    disabled={form.controlsDisabled}
                    onChange={(e) => form.setDescription(e.target.value)}
                    rows={4}
                  />
                </td>
              </tr>

              {isCreate ? (
                <>
                  <tr>
                    <td>Imagen principal</td>
                    <td>
                      <input
                        value={form.imageUrl}
                        disabled={form.controlsDisabled}
                        onChange={(e) => form.setImageUrl(e.target.value)}
                        placeholder="URL de la imagen"
                      />
                      {form.imageUrl && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <img
                            src={form.imageUrl}
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
                        value={form.carouselImages}
                        disabled={form.controlsDisabled}
                        onChange={(e) => form.setCarouselImages(e.target.value)}
                        rows={4}
                        placeholder="Una URL por línea"
                      />
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <td>Imagen principal</td>
                    <td>
                      <input
                        value={form.imageUrl}
                        disabled={form.controlsDisabled}
                        onChange={(e) => form.setImageUrl(e.target.value)}
                      />
                      <div className={styles.imageUploadControls}>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          disabled={form.controlsDisabled}
                          onChange={(event) => {
                            void form.handleUploadMainImage(event.target.files?.[0]);
                            event.target.value = '';
                          }}
                        />
                      </div>
                      {form.imageUrl && (
                        <div className={styles.imagePreviewList}>
                          <div className={styles.imagePreviewItem}>
                            <div
                              className={styles.imagePreviewThumb}
                              role="img"
                              aria-label={`Imagen principal de ${form.name}`}
                              style={{ backgroundImage: `url(${form.imageUrl})` }}
                            />
                            <button
                              className={styles.deleteBtn}
                              type="button"
                              disabled={form.controlsDisabled}
                              onClick={() => void form.handleRemoveImage(form.imageUrl, () => form.setImageUrl(''))}
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
                      <textarea
                        value={form.carouselImages}
                        disabled={form.controlsDisabled}
                        onChange={(e) => form.setCarouselImages(e.target.value)}
                      />
                      <div className={styles.imageUploadControls}>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          multiple
                          disabled={form.controlsDisabled}
                          onChange={(event) => {
                            void form.handleUploadCarouselImages(event.target.files);
                            event.target.value = '';
                          }}
                        />
                      </div>
                      {form.currentCarouselImages.length > 0 && (
                        <div className={styles.imagePreviewList}>
                          {form.currentCarouselImages.map((url) => (
                            <div className={styles.imagePreviewItem} key={url}>
                              <div
                                className={styles.imagePreviewThumb}
                                role="img"
                                aria-label={`Imagen adicional de ${form.name}`}
                                style={{ backgroundImage: `url(${url})` }}
                              />
                              <button
                                className={styles.deleteBtn}
                                type="button"
                                disabled={form.controlsDisabled}
                                onClick={() => void form.handleRemoveImage(
                                  url,
                                  () => form.setCarouselImages(
                                    form.currentCarouselImages.filter((image) => image !== url).join('\n')
                                  )
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
                </>
              )}
            </tbody>
          </table>
        </div>

        {!isCreate && form.imageError && <p className={styles.empty}>{form.imageError}</p>}
        {!isCreate && form.isUploading && <p className={styles.empty}>Procesando imagen...</p>}

        <div className={styles.backLink} style={isCreate ? { marginTop: '1rem' } : undefined}>
          <button className={styles.deleteBtn} type="submit" disabled={form.controlsDisabled}>
            {isSaving ? 'Guardando...' : form.submitLabel}
          </button>{' '}
          <button className={styles.deleteBtn} type="button" disabled={form.controlsDisabled} onClick={onCancel}>
            Cancelar
          </button>
        </div>
        </form>
      )}
    </section>
  );
}
