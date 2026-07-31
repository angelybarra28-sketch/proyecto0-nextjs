'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminTrashTable } from '@/components/Admin/Products/AdminTrashTable';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import type { AdminTrashedProduct } from '@/lib/adapters/catalogAdapter';
import { fetchTrashedProducts, hardDeleteAdminProduct, restoreAdminProduct } from '@/lib/services/admin/client';
import styles from '@/styles/Admin.module.css';

export function AdminTrashPage() {
  const { isAdmin } = useAdminAccess();
  const [products, setProducts] = useState<AdminTrashedProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadTrash = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError('');
    try {
      const payload = await fetchTrashedProducts(signal);
      setProducts(payload.products);
      setTotal(payload.total);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      console.error('Error loading trash:', loadError);
      setError('No se pudo cargar la papelera');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    void loadTrash(controller.signal);
    return () => controller.abort();
  }, [isAdmin, loadTrash]);

  const handleRestore = async (product: AdminTrashedProduct) => {
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      await restoreAdminProduct(product.id);
      setNotice(`"${product.name}" fue restaurado correctamente`);
      await loadTrash();
    } catch (restoreError) {
      console.error('Error restoring product:', restoreError);
      setError(restoreError instanceof Error ? restoreError.message : 'No se pudo restaurar el producto');
    } finally {
      setIsBusy(false);
    }
  };

  const handleHardDelete = async (product: AdminTrashedProduct) => {
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      await hardDeleteAdminProduct(product.id);
      setNotice(`"${product.name}" fue eliminado definitivamente`);
      await loadTrash();
    } catch (deleteError) {
      console.error('Error hard-deleting product:', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el producto definitivamente');
    } finally {
      setIsBusy(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Papelera de Productos</h1>

      {error && <p className={styles.adminAlertError}>{error}</p>}
      {notice && <p className={styles.adminAlertSuccess}>{notice}</p>}

      <div className={styles.sections}>
        <div className={styles.section}>
          <div className={styles.adminTableHeader}>
            <div>
              <p className={styles.adminTableSummary}>
                {total === 0 ? 'Sin productos en la papelera' : `${total} producto(s) en la papelera`}
              </p>
            </div>
            {isBusy && <span className={styles.adminReadonlyBadge}>Procesando...</span>}
          </div>
          <AdminTrashTable
            products={products}
            isLoading={isLoading}
            isBusy={isBusy}
            onRestore={handleRestore}
            onHardDelete={handleHardDelete}
          />
        </div>
      </div>

      <div className={styles.backLink}>
        <Link href="/admin/productos">Volver a Productos</Link>
        <span> · </span>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
