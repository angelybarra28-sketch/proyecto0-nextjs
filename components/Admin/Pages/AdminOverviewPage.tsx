'use client';

import Link from 'next/link';
import { AdminUsersSection } from '@/components/Admin/Customers/AdminUsersSection';
import { useAdminAccess, useAdminUsers } from '@/components/Admin/useAdminData';
import styles from '@/styles/Admin.module.css';

export function AdminOverviewPage() {
  const { isAdmin } = useAdminAccess();
  const { users, handleToggleUser } = useAdminUsers(isAdmin);

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Panel de Administración</h1>

      <div className={styles.actionButtonsRow}>
        <Link href="/admin/cuenta-corriente">
          <button className={styles.adminActionButton}>
            Cuenta Corriente
          </button>
        </Link>

        <Link href="/admin/estadisticas">
          <button className={styles.adminActionButton}>
            Estadísticas
          </button>
        </Link>

        <Link href="/admin/ventas">
          <button className={styles.adminActionButton}>
            Ventas
          </button>
        </Link>

        <Link href="/admin/ventas/nueva">
          <button className={styles.adminPrimaryButton}>
            Venta Manual
          </button>
        </Link>

        <Link href="/admin/productos">
          <button className={styles.adminActionButton}>
            Productos
          </button>
        </Link>

        <Link href="/admin/categorias">
          <button className={styles.adminActionButton}>
            Categorías
          </button>
        </Link>

        <Link href="/admin/provedores">
          <button className={styles.adminActionButton}>
            Proveedores
          </button>
        </Link>

        <Link href="/admin/importacion-cartera">
          <button className={styles.adminActionButton}>
            Importar Cartera
          </button>
        </Link>

        <Link href="/">
          <button className={styles.adminActionButton}>
            Volver al inicio
          </button>
        </Link>
      </div>

      <div className={styles.sections}>
        <AdminUsersSection users={users} onToggleUser={handleToggleUser} />
      </div>

    </div>
  );
}
