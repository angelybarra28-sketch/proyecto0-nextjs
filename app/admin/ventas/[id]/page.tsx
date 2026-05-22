'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { fetchAdminSaleDetail } from '@/lib/services/adminSalesClient';
import type { AdminSaleDetail, CollectionStatus, SaleStatus } from '@/lib/supabase/types';
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

export default function AdminSaleDetailPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [sale, setSale] = useState<AdminSaleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      router.push('/auth');
      return;
    }

    fetchAdminSaleDetail(params.id)
      .then(setSale)
      .catch((loadError: unknown) => {
        console.error('Error loading sale detail:', loadError);
        setError('No se pudo cargar el detalle de la venta');
      })
      .finally(() => setIsLoading(false));
  }, [isAdmin, params.id, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Detalle de Venta</h1>

      <div className={styles.sections}>
        {isLoading && <section className={styles.section}><p className={styles.empty}>Cargando venta...</p></section>}
        {error && <section className={styles.section}><p className={styles.empty}>{error}</p></section>}

        {sale && (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{sale.saleNumber}</h2>
              <table className={styles.table}>
                <tbody>
                  <tr><td>Cliente</td><td>{sale.customer?.fullName ?? sale.deliveryFullName ?? 'Sin nombre'}</td></tr>
                  <tr><td>Teléfono</td><td>{sale.customer?.phone ?? sale.deliveryPhone ?? '-'}</td></tr>
                  <tr><td>Email</td><td>{sale.customer?.email ?? '-'}</td></tr>
                  <tr><td>Dirección</td><td>{sale.deliveryAddress ?? sale.customer?.address ?? '-'}</td></tr>
                  <tr><td>Localidad</td><td>{sale.deliveryCity ?? sale.customer?.city ?? '-'}</td></tr>
                  <tr><td>Fecha</td><td>{new Date(sale.saleDate).toLocaleString('es-AR')}</td></tr>
                  <tr>
                    <td>Estado de venta</td>
                    <td><span className={`${styles.status} ${styles[getStatusClass(sale.saleStatus)]}`}>{sale.saleStatus}</span></td>
                  </tr>
                  <tr>
                    <td>Estado de cobranza</td>
                    <td><span className={`${styles.status} ${styles[getStatusClass(sale.collectionStatus)]}`}>{sale.collectionStatus}</span></td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Productos ({sale.itemCount})</h2>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Precio</th>
                      <th>Cantidad</th>
                      <th>Subtotal</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.category ?? '-'}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.subtotal)}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Resumen Económico</h2>
              <table className={styles.table}>
                <tbody>
                  <tr><td>Subtotal</td><td>{formatCurrency(sale.subtotal)}</td></tr>
                  <tr><td>Descuento</td><td>{formatCurrency(sale.discountAmount)}</td></tr>
                  <tr><td>Total</td><td>{formatCurrency(sale.total)}</td></tr>
                  <tr><td>Pagado</td><td>{formatCurrency(sale.paidAmount)}</td></tr>
                  <tr><td>Restante</td><td>{formatCurrency(sale.remainingAmount)}</td></tr>
                  <tr><td>Método solicitado</td><td>{sale.paymentMethodRequested ?? '-'}</td></tr>
                  <tr><td>Creada</td><td>{new Date(sale.createdAt).toLocaleString('es-AR')}</td></tr>
                  <tr><td>Actualizada</td><td>{new Date(sale.updatedAt).toLocaleString('es-AR')}</td></tr>
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>

      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
