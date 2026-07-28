'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import styles from './MiCuenta.module.css';

type ResumenData = {
  customer: { id: string; nombre: string; telefono: string | null; email: string | null } | null;
  resumen: {
    saldoDeudor: number;
    cuotasAtrasadas: { cantidad: number; monto: number };
    cuotasPagadas: { cantidad: number; monto: number };
    totalCuotas: number;
  } | null;
  cuentas: Array<{
    id: string;
    operationNumber: string | null;
    producto: string;
    cantidad: number;
    cuotas: number;
    montoCuota: number;
    fecha: string;
    activa: boolean;
    items: Array<{ productName: string; quantity: number }>;
    cuotasDetalle: Array<{
      installmentNumber: number;
      dueDate: string;
      originalAmount: number;
      paidAmount: number;
      remainingAmount: number;
      status: string;
    }>;
    pagos: Array<{ amount: number; paymentMethod: string; paymentDate: string }>;
  }>;
  message?: string;
};

export default function MiCuentaPage() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    fetch('/api/mi-cuenta/resumen')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError('Error al cargar los datos');
        setLoading(false);
      });
  }, [isAuthenticated, isAuthLoading, router]);

  if (isAuthLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>{error}</div>
      </div>
    );
  }

  if (!data?.customer) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Mi Cuenta</h1>
          <p className={styles.message}>{data?.message || 'Tu cuenta aún no está vinculada a un cliente.'}</p>
        </div>
      </div>
    );
  }

  const r = data.resumen!;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mi Cuenta</h1>
        <p className={styles.welcome}>Bienvenido, {data.customer.nombre}</p>
      </div>

      <div className={styles.cards}>
        <div className={`${styles.card} ${styles.cardDeuda}`}>
          <div className={styles.cardLabel}>Saldo Deudor</div>
          <div className={styles.cardValue}>${r.saldoDeudor.toLocaleString()}</div>
        </div>

        <div className={`${styles.card} ${styles.cardAtrasadas}`}>
          <div className={styles.cardLabel}>Cuotas Atrasadas</div>
          <div className={styles.cardValue}>{r.cuotasAtrasadas.cantidad}</div>
          <div className={styles.cardSub}>${r.cuotasAtrasadas.monto.toLocaleString()}</div>
        </div>

        <div className={`${styles.card} ${styles.cardPagadas}`}>
          <div className={styles.cardLabel}>Cuotas Pagadas</div>
          <div className={styles.cardValue}>{r.cuotasPagadas.cantidad}</div>
          <div className={styles.cardSub}>${r.cuotasPagadas.monto.toLocaleString()}</div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Historial de Compras</h2>
        {data.cuentas.length === 0 ? (
          <p className={styles.empty}>No tenés compras registradas</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Cuotas</th>
                  <th>Monto Cuota</th>
                  <th>Pagadas</th>
                  <th>Atrasadas</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.cuentas.map((cuenta) => {
                  const pagadas = cuenta.cuotasDetalle.filter((c) => c.status === 'PAID').length;
                  const atrasadas = cuenta.cuotasDetalle.filter((c) => c.status === 'OVERDUE').length;
                  const total = cuenta.cuotasDetalle.length;
                  return (
                    <tr key={cuenta.id}>
                      <td>{new Date(cuenta.fecha).toLocaleDateString()}</td>
                      <td>
                        {cuenta.producto}
                        {cuenta.items.length > 1 && (
                          <div className={styles.itemSub}>
                            {cuenta.items.map((it, i) => (
                              <span key={i}>{it.productName} x{it.quantity}{i < cuenta.items.length - 1 ? ', ' : ''}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>{total}</td>
                      <td>${Number(cuenta.montoCuota).toLocaleString()}</td>
                      <td className={styles.textGreen}>{pagadas}</td>
                      <td className={styles.textRed}>{atrasadas > 0 ? atrasadas : '-'}</td>
                      <td>
                        <span className={`${styles.badge} ${cuenta.activa ? styles.badgeActive : styles.badgeFinished}`}>
                          {cuenta.activa ? 'Activa' : 'Finalizada'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
