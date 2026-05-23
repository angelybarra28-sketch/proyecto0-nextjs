'use client';

import { useEffect, useState } from 'react';
import { AdminProductsTable } from '@/components/Admin/Products/AdminProductsTable';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import { fetchAdminProducts, updateAdminProduct } from '@/lib/services/admin/client';
import styles from '@/styles/Admin.module.css';

type AdminProductsSectionProps = {
  enabled: boolean;
};

export function AdminProductsSection({ enabled }: AdminProductsSectionProps) {
  const [products, setProducts] = useState<AdminCatalogProduct[]>([]);
  const [source, setSource] = useState<'supabase' | 'local-fallback'>('supabase');
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
    setNotice(`Editar producto: ${product.name}. El formulario de edición queda para la siguiente etapa.`);
  };

  if (isLoading) {
    return <p className={styles.empty}>Cargando productos...</p>;
  }

  const isReadOnly = source === 'local-fallback';

  return (
    <>
      {error && <p className={styles.empty}>{error}</p>}
      {notice && <p className={styles.empty}>{notice}</p>}
      <AdminProductsTable
        products={products}
        isReadOnly={isReadOnly || isSaving}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
      />
    </>
  );
}
