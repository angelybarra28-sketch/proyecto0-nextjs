'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

export default function AdminPage() {
  const { isAdmin, getAllUsers, deleteUser, user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/auth');
      return;
    }

    // Cargar usuarios
    setUsers(getAllUsers());

    // Cargar pedidos desde localStorage
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) {
      setOrders(JSON.parse(savedOrders));
    }
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
          <h2 className={styles.sectionTitle}>Pedidos Realizados ({orders.length})</h2>
          
          {orders.length === 0 ? (
            <p className={styles.empty}>No hay pedidos registrados</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID Pedido</th>
                    <th>Usuario</th>
                    <th>Total</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.userName || 'Usuario'}</td>
                      <td>${order.total?.toFixed(2)}</td>
                      <td>{new Date(order.date).toLocaleDateString()}</td>
                      <td>
                        <span className={`${styles.status} ${styles[order.status]}`}>
                          {order.status}
                        </span>
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
        <a href="/">Volver al inicio</a>
      </div>
    </div>
  );
}