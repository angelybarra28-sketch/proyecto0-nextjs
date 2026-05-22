'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User } from '@/lib/types';
import { fetchAdminSales } from '@/lib/services/adminSalesClient';
import type { AdminSaleSummary, SaleStatus, CollectionStatus } from '@/lib/supabase/types';
import styles from '@/styles/Admin.module.css';

function formatCurrency(value: number) {
  return value.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getStatusClass(status: SaleStatus | CollectionStatus) {
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'DELIVERED' || status === 'CONFIRMED' || status === 'PAID') return 'completed';
  return 'pending';
}

export default function AdminPage() {
  const { isAdmin, getAllUsers, deleteUser, user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [sales, setSales] = useState<AdminSaleSummary[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [salesError, setSalesError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      router.push('/auth');
      return;
    }

    window.setTimeout(() => setUsers(getAllUsers()), 0);

    fetchAdminSales()
      .then(setSales)
      .catch((error: unknown) => {
        console.error('Error loading sales:', error);
        setSalesError('No se pudieron cargar las ventas reales desde Supabase');
      })
      .finally(() => setIsLoadingSales(false));
  }, [isAdmin, getAllUsers, router]);

  const handleDeleteUser = (id: string) => {
    if (confirm('¿Está seguro de eliminar este usuario?')) {
      deleteUser(id);
      setUsers(getAllUsers());
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Panel de Administración</h1>
      <p className={styles.subtitle}>Bienvenido, {user?.nombreApellido}</p>

      <div className={styles.sections}>
        {/* Sección de Usuarios */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Usuarios Registrados ({users.length})</h2>
          
          {users.length === 0 ? (
            <p className={styles.empty}>No hay usuarios registrados</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>DNI</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Domicilio</th>
                    <th>Fecha de Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.dni}</td>
                      <td>{u.nombreApellido}</td>
                      <td>{u.email}</td>
                      <td>{u.telefono}</td>
                      <td>{u.domicilio}</td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className={styles.deleteBtn}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Sección de Pedidos */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ventas Realizadas ({sales.length})</h2>

          {isLoadingSales && <p className={styles.empty}>Cargando ventas...</p>}

          {salesError && <p className={styles.empty}>{salesError}</p>}
          
          {!isLoadingSales && !salesError && sales.length === 0 ? (
            <p className={styles.empty}>No hay ventas registradas en Supabase</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Venta</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Productos</th>
                    <th>Venta</th>
                    <th>Cobranza</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.saleNumber}</td>
                      <td>{sale.customerName}</td>
                      <td>{new Date(sale.saleDate).toLocaleDateString('es-AR')}</td>
                      <td>{formatCurrency(sale.total)}</td>
                      <td>{sale.itemCount}</td>
                      <td>
                        <span className={`${styles.status} ${styles[getStatusClass(sale.saleStatus)]}`}>
                          {sale.saleStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.status} ${styles[getStatusClass(sale.collectionStatus)]}`}>
                          {sale.collectionStatus}
                        </span>
                      </td>
                      <td>
                        <Link href={`/admin/ventas/${sale.id}`} className={styles.deleteBtn}>
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className={styles.backLink}>
        <Link href="/">Volver al inicio</Link>
      </div>
    </div>
  );
}
