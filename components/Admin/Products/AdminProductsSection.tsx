'use client';

import { useEffect, useState } from 'react';
import { AdminProductEditForm } from '@/components/Admin/Products/AdminProductEditForm';
import { AdminProductsTable } from '@/components/Admin/Products/AdminProductsTable';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { AdminCatalogCategory, AdminProductPayload } from '@/lib/services/adminCatalogService';
import { fetchAdminProducts, updateAdminProduct } from '@/lib/services/admin/client';
import styles from '@/styles/Admin.module.css';

type AdminProductsSectionProps = {
  enabled: boolean;
};

export function AdminProductsSection({ enabled }: AdminProductsSectionProps) {
  const [products, setProducts] = useState<AdminCatalogProduct[]>([]);
  const [categories, setCategories] = useState<AdminCatalogCategory[]>([]);
  const [source, setSource] = useState<'supabase' | 'local-fallback'>('supabase');
  const [selectedProduct, setSelectedProduct] = useState<AdminCatalogProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProducts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const catalog = await fetchAdminProducts();
      setProducts(catalog.products);
      setCategories(catalog.categories);
      setSource(catalog.source);
    } catch (loadError) {
      console.error('Error loading admin products:', loadError);
      setError('No se pudieron cargar los productos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    void loadProducts();
  }, [enabled]);

  const handleToggleStatus = async (product: AdminCatalogProduct) => {
    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      await updateAdminProduct(product.id, {
        status: product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      await loadProducts();
    } catch (updateError) {
      console.error('Error updating product:', updateError);
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el producto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product: AdminCatalogProduct) => {
    setError('');
    setNotice('');
    setSelectedProduct(product);
  };

  const handleSaveProduct = async (productId: string, payload: AdminProductPayload) => {
    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      await updateAdminProduct(productId, payload);
      setSelectedProduct(null);
      await loadProducts();
      setNotice('Producto actualizado correctamente');
    } catch (saveError) {
      console.error('Error saving product:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el producto');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className={styles.empty}>Cargando productos...</p>;
  }

  const isReadOnly = source === 'local-fallback';

  return (
    <>
      {error && <p className={styles.empty}>{error}</p>}
      {notice && <p className={styles.empty}>{notice}</p>}
      {selectedProduct && !isReadOnly && (
        <AdminProductEditForm
          key={selectedProduct.id}
          product={selectedProduct}
          categories={categories}
          isSaving={isSaving}
          onSubmit={handleSaveProduct}
          onCancel={() => setSelectedProduct(null)}
        />
      )}
      <AdminProductsTable
        products={products}
        isReadOnly={isReadOnly || isSaving}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
      />
    </>
  );
}
