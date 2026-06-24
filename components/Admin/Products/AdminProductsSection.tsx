'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminProductEditForm } from '@/components/Admin/Products/AdminProductEditForm';
import { AdminProductCreateForm } from '@/components/Admin/Products/AdminProductCreateForm';
import { AdminProductsTable } from '@/components/Admin/Products/AdminProductsTable';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { AdminCatalogCategory, AdminProductPayload } from '@/lib/services/adminCatalogService';
import { deleteAdminProduct as apiDeleteProduct, fetchAdminProducts, updateAdminProduct, createAdminProduct } from '@/lib/services/admin/client';
import type { AdminPagination } from '@/lib/services/admin/types';
import { useAdminProductTable } from '@/hooks/useAdminProductTable';
import styles from '@/styles/Admin.module.css';

type AdminProductsSectionProps = {
  enabled: boolean;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function AdminProductsSection({ enabled }: AdminProductsSectionProps) {
  const [products, setProducts] = useState<AdminCatalogProduct[]>([]);
  const [categories, setCategories] = useState<AdminCatalogCategory[]>([]);
  const [pagination, setPagination] = useState<AdminPagination | null>(null);
  const [source, setSource] = useState<'supabase' | 'local-fallback'>('supabase');
  const [selectedProduct, setSelectedProduct] = useState<AdminCatalogProduct | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const table = useAdminProductTable(pagination);

  const loadProducts = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError('');

    try {
      const catalog = await fetchAdminProducts(table.query, signal);
      
      // Si estamos en modo local, mezclar con productos guardados en localStorage
      if (catalog.source === 'local-fallback') {
        const localProducts = JSON.parse(localStorage.getItem('localProducts') || '[]');
        const allProducts = [...localProducts, ...catalog.products];
        setProducts(allProducts);
      } else {
        setProducts(catalog.products);
      }
      
      setCategories(catalog.categories);
      setPagination(catalog.pagination);
      setSource(catalog.source);
    } catch (loadError) {
      if (isAbortError(loadError)) return;
      console.error('Error loading admin products:', loadError);
      setError('No se pudieron cargar los productos');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [table.query]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void loadProducts(controller.signal);

    return () => controller.abort();
  }, [enabled, loadProducts]);

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

  const handleDelete = async (product: AdminCatalogProduct) => {
    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      if (isReadOnly) {
        // Modo local: eliminar de localStorage
        const localProducts = JSON.parse(localStorage.getItem('localProducts') || '[]');
        const filtered = localProducts.filter((p: { id: string }) => p.id !== product.id);
        localStorage.setItem('localProducts', JSON.stringify(filtered));
      } else {
        await apiDeleteProduct(product.id);
        // También limpiar localStorage por si hay datos stale de sesiones anteriores
        try {
          localStorage.removeItem('localProducts');
        } catch { /* ignore */ }
      }
      await loadProducts();
      setNotice('Producto eliminado correctamente');
    } catch (deleteError) {
      console.error('Error deleting product:', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el producto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product: AdminCatalogProduct) => {
    setError('');
    setNotice('');
    setSelectedProduct(product);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
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

  const handleCreateProduct = async (payload: AdminProductPayload) => {
    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      if (isReadOnly) {
        // Modo local: guardar en localStorage
        const localProducts = JSON.parse(localStorage.getItem('localProducts') || '[]');
        const newProduct = {
          id: `local-${Date.now()}`,
          legacyProductId: null,
          categoryId: payload.categoryId,
          categoryName: categories.find(c => c.id === payload.categoryId)?.name || 'Sin categoría',
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          price: payload.price,
          compareAtPrice: payload.compareAtPrice,
          discountLabel: payload.discountLabel,
          referencePrice: payload.referencePrice,
          installmentCount: payload.installmentCount,
          installmentAmount: payload.installmentAmount,
          stock: payload.stock,
          status: payload.status,
          featured: payload.featured,
          imageUrl: payload.imageUrl || '',
          carouselImages: payload.carouselImages,
          createdAt: new Date().toISOString(),
        };
        localProducts.push(newProduct);
        localStorage.setItem('localProducts', JSON.stringify(localProducts));
        setShowCreateForm(false);
        await loadProducts();
        setNotice('Producto creado correctamente (modo local)');
      } else {
        await createAdminProduct(payload);
        setShowCreateForm(false);
        await loadProducts();
        setNotice('Producto creado correctamente');
      }
    } catch (createError) {
      console.error('Error creating product:', createError);
      setError(createError instanceof Error ? createError.message : 'No se pudo crear el producto');
    } finally {
      setIsSaving(false);
    }
  };

  const isReadOnly = source === 'local-fallback';

  return (
    <>
      {error && <p className={styles.adminAlertError}>{error}</p>}
      {notice && <p className={styles.adminAlertSuccess}>{notice}</p>}
      
      {!showCreateForm && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            className={styles.deleteBtn}
            onClick={() => setShowCreateForm(true)}
            disabled={isSaving}
          >
            + Crear producto nuevo
          </button>
        </div>
      )}

      {showCreateForm && (
        <AdminProductCreateForm
          categories={categories}
          isSaving={isSaving}
          onSubmit={handleCreateProduct}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {selectedProduct && (
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
        categories={categories}
        table={table}
        isLoading={isLoading}
        isReadOnly={isReadOnly || isSaving}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />
    </>
  );
}
