'use client';

import Link from 'next/link';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import styles from '@/styles/Admin.module.css';

export function AdminProvedoresPage() {
  const { isAdmin } = useAdminAccess();

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <div className={styles.headerCompact}>
        <div>
          <h1 className={styles.title} style={{ margin: 0, textAlign: 'left' }}>
            Proveedores
          </h1>
          <p className={styles.subtitle} style={{ margin: '2px 0 0 0', textAlign: 'left', fontSize: 14, color: '#d3cdc4' }}>
            Gestión de proveedores
          </p>
        </div>
      </div>

      <div className={styles.sections}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Próximamente</h2>
          <p className={styles.empty}>Sección en desarrollo</p>
        </section>
      </div>

      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
