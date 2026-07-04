'use client';

import Link from 'next/link';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import { AdminCategoriesSection } from '@/components/Admin/Categories/AdminCategoriesSection';
import styles from '@/styles/Admin.module.css';

export function AdminCategoriesPage() {
  const { isAdmin } = useAdminAccess();

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Administrar Categorías</h1>
      <div className={styles.sections}>
        <AdminCategoriesSection />
      </div>
      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
