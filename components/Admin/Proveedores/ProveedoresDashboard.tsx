'use client';

import { useEffect, useState } from 'react';
import type { ProveedorDashboard } from '@/lib/supabase/types';
import { fetchProveedorDashboard } from '@/lib/services/admin/client';
import { ProveedorAlertasSummaryCards } from './ProveedorAlertasSummaryCards';
import { ProveedorAlertasPanel } from './ProveedorAlertasPanel';
import { IndicadorEstadoBadge } from './ProveedorIndicadores';
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

      {data.proveedores.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f5f2ec', marginBottom: 10 }}>Estado por Proveedor</h3>
          <div className={styles.tableContainer} style={{ marginBottom: 20 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Comprado</th>
                  <th>Pagado</th>
                  <th>Pendiente</th>
                  <th>Pendientes</th>
                  <th>Parciales</th>
                  <th>Pagadas</th>
                </tr>
              </thead>
              <tbody>
                {data.proveedores.map((p) => (
                  <tr key={p.proveedor_id}>
                    <td style={{ fontWeight: 600 }}>{p.proveedor_nombre}</td>
                    <td>{formatCurrency(p.total_comprado)}</td>
                    <td style={{ color: '#22c55e' }}>{formatCurrency(p.total_pagado)}</td>
                    <td style={{ fontWeight: 700, color: p.total_pendiente > 0 ? '#f87171' : '#22c55e' }}>
                      {formatCurrency(p.total_pendiente)}
                    </td>
                    <td>{p.facturas_pendientes > 0 ? p.facturas_pendientes : '—'}</td>
                    <td>{p.facturas_parciales > 0 ? p.facturas_parciales : '—'}</td>
                    <td>{p.facturas_pagadas > 0 ? p.facturas_pagadas : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

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
                <td><IndicadorEstadoBadge estado={c.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
