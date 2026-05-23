'use client';

import Link from 'next/link';
import { AdminProductsSection } from '@/components/Admin/Products/AdminProductsSection';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import styles from '@/styles/Admin.module.css';

export function AdminProductsPage() {
  const { isAdmin } = useAdminAccess();

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Productos</h1>
      <div className={styles.sections}>
        <AdminProductsSection enabled={isAdmin} />
      </div>
      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
