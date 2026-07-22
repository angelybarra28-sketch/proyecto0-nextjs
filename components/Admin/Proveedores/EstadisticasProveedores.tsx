'use client';

import { useEffect, useState } from 'react';
import { fetchEstadisticasCompras } from '@/lib/services/admin/client';
import styles from '@/styles/Admin.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

type Stats = {
  compras_por_mes: { mes: string; total: number }[];
  compras_por_proveedor: { proveedor: string; total: number }[];
  evolucion_gasto: { mes: string; total: number; acumulado: number }[];
};

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <div style={{ flex: 1, height: 20, background: '#1e1d1b', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

export function EstadisticasProveedores() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstadisticasCompras()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={styles.empty}>Cargando estadísticas...</p>;
  if (!stats) return <p className={styles.empty}>Sin datos disponibles</p>;

  const maxMes = Math.max(...stats.compras_por_mes.map((m) => m.total), 1);
  const maxProv = Math.max(...stats.compras_por_proveedor.map((p) => p.total), 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ background: '#262422', borderRadius: 10, padding: 16, border: '1px solid #363330' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f5f2ec', marginTop: 0, marginBottom: 12 }}>Compras por Mes</h3>
        {stats.compras_por_mes.length === 0 ? (
          <p className={styles.empty}>Sin datos</p>
        ) : stats.compras_por_mes.map((m) => (
          <div key={m.mes} style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#d3cdc4', marginBottom: 2 }}>
              <span>{m.mes}</span>
              <span>{formatCurrency(m.total)}</span>
            </div>
            <Bar value={m.total} max={maxMes} color="#667eea" />
          </div>
        ))}
      </div>

      <div style={{ background: '#262422', borderRadius: 10, padding: 16, border: '1px solid #363330' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f5f2ec', marginTop: 0, marginBottom: 12 }}>Compras por Proveedor</h3>
        {stats.compras_por_proveedor.length === 0 ? (
          <p className={styles.empty}>Sin datos</p>
        ) : stats.compras_por_proveedor.map((p) => (
          <div key={p.proveedor} style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#d3cdc4', marginBottom: 2 }}>
              <span>{p.proveedor}</span>
              <span>{formatCurrency(p.total)}</span>
            </div>
            <Bar value={p.total} max={maxProv} color="#34d399" />
          </div>
        ))}
      </div>

      <div style={{ gridColumn: '1 / -1', background: '#262422', borderRadius: 10, padding: 16, border: '1px solid #363330' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f5f2ec', marginTop: 0, marginBottom: 12 }}>Evolución del Gasto</h3>
        {stats.evolucion_gasto.length === 0 ? (
          <p className={styles.empty}>Sin datos</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Compras</th>
                  <th>Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {stats.evolucion_gasto.map((e) => (
                  <tr key={e.mes}>
                    <td>{e.mes}</td>
                    <td>{formatCurrency(e.total)}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(e.acumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
