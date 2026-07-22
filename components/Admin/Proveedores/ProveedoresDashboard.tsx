'use client';

import { useEffect, useState } from 'react';
import type { ProveedorDashboard } from '@/lib/supabase/types';
import { fetchProveedorDashboard } from '@/lib/services/admin/client';
import { ProveedorAlertasSummaryCards } from './ProveedorAlertasSummaryCards';
import { ProveedorAlertasPanel } from './ProveedorAlertasPanel';
import { IndicadorEstado } from './ProveedorIndicadores';
import styles from '@/styles/Admin.module.css';
import type { Tab } from './ProveedoresTabs';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

export function ProveedoresDashboard({ onNavigateTab }: { onNavigateTab?: (tab: Tab) => void }) {
  const [data, setData] = useState<ProveedorDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchProveedorDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <p className={styles.empty}>Cargando dashboard...</p>;
  if (!data) return <p className={styles.empty}>No hay datos disponibles</p>;

  return (
    <div>
      <ProveedorAlertasSummaryCards onNavigateTab={onNavigateTab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Compras del Mes', value: formatCurrency(data.compras_mes), bg: '#f0fdf4', color: '#065f46' },
          { label: 'Deuda Total', value: formatCurrency(data.deuda_total), bg: '#fef2f2', color: '#991b1b' },
          { label: 'Facturas Pendientes', value: String(data.facturas_pendientes), bg: '#fef3c7', color: '#92400e' },
          { label: 'Total Comprado', value: formatCurrency(data.total_comprado), bg: '#eff6ff', color: '#1e40af' },
          { label: 'Total Pagado', value: formatCurrency(data.total_pagado), bg: '#f0fdf4', color: '#065f46' },
        ].map((card) => (
          <div key={card.label} style={{ background: card.bg, borderRadius: 10, padding: 14, color: '#333' }}>
            <p style={{ fontSize: 11, color: '#666', margin: 0, fontWeight: 600 }}>{card.label}</p>
            <p style={{ fontWeight: 700, margin: '6px 0 0', fontSize: 18, color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      <ProveedorAlertasPanel onNavigateTab={onNavigateTab} />

      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f5f2ec', marginBottom: 10 }}>Últimas Compras</h3>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Fecha</th>
              <th>Importe</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.ultimas_compras.length === 0 ? (
              <tr><td colSpan={4} className={styles.empty}>Sin compras recientes</td></tr>
            ) : data.ultimas_compras.map((c) => (
              <tr key={c.id}>
                <td>{c.proveedor_nombre}</td>
                <td>{new Date(c.fecha).toLocaleDateString('es-AR')}</td>
                <td>{formatCurrency(c.importe_total)}</td>
                <td><IndicadorEstado estado={c.estado} fecha={c.fecha} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
