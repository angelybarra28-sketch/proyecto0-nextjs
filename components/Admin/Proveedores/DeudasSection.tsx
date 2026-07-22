'use client';

import { useEffect, useState } from 'react';
import type { ProveedorDeuda } from '@/lib/supabase/types';
import { fetchDeudas } from '@/lib/services/admin/client';
import { IndicadorDeuda } from './ProveedorIndicadores';
import styles from '@/styles/Admin.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

export function DeudasSection() {
  const [deudas, setDeudas] = useState<ProveedorDeuda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeudas()
      .then(setDeudas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={styles.empty}>Cargando deudas...</p>;
  if (deudas.length === 0) return <p className={styles.empty}>No hay deudas registradas</p>;

  const totalDeuda = deudas.reduce((s, d) => s + d.saldo_pendiente, 0);

  return (
    <div>
      <div style={{ marginBottom: 16, padding: 14, background: '#fef2f2', borderRadius: 10, color: '#333' }}>
        <p style={{ fontSize: 11, color: '#666', margin: 0, fontWeight: 600 }}>Deuda Total</p>
        <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 22, color: '#991b1b' }}>{formatCurrency(totalDeuda)}</p>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 20 }}></th>
              <th>Proveedor</th>
              <th>Total Comprado</th>
              <th>Total Pagado</th>
              <th>Saldo Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {deudas.map((d) => (
              <tr key={d.proveedor_id}>
                <td><IndicadorDeuda saldo={d.saldo_pendiente} /></td>
                <td style={{ fontWeight: 600 }}>{d.proveedor_nombre}</td>
                <td>{formatCurrency(d.total_comprado)}</td>
                <td>{formatCurrency(d.total_pagado)}</td>
                <td>
                  <span style={{
                    fontWeight: 700,
                    color: d.saldo_pendiente > 0 ? '#991b1b' : '#065f46',
                  }}>
                    {formatCurrency(d.saldo_pendiente)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
