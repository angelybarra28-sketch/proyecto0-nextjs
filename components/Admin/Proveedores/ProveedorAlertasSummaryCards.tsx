'use client';

import { useEffect, useState } from 'react';
import type { ProveedorAlerta, AlertaTipo } from '@/lib/supabase/types';
import { fetchProveedorAlertas } from '@/lib/services/admin/client';

type CountMap = Record<AlertaTipo, number>;

const CARD_CONFIG: { tipo: AlertaTipo; icono: string; label: string; bg: string; color: string; tab: 'compras' | 'proveedores' }[] = [
  { tipo: 'factura_pendiente', icono: '🔴', label: 'Facturas pendientes', bg: '#fef2f2', color: '#991b1b', tab: 'compras' },
  { tipo: 'saldo_pendiente', icono: '🟡', label: 'Pagos parciales', bg: '#fffbeb', color: '#92400e', tab: 'compras' },
  { tipo: 'sin_factura_adjunto', icono: '🔵', label: 'Sin factura/adjunto', bg: '#eff6ff', color: '#1e40af', tab: 'compras' },
  { tipo: 'sin_movimiento', icono: '⚪', label: 'Sin movimiento', bg: '#f9fafb', color: '#6b7280', tab: 'proveedores' },
];

export function ProveedorAlertasSummaryCards({ onNavigateTab }: { onNavigateTab?: (tab: 'compras' | 'proveedores') => void }) {
  const [counts, setCounts] = useState<CountMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProveedorAlertas()
      .then((alertas) => {
        const c: CountMap = { factura_pendiente: 0, saldo_pendiente: 0, sin_movimiento: 0, sin_factura_adjunto: 0 };
        for (const a of alertas) c[a.tipo]++;
        setCounts(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!counts) return null;

  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
      {CARD_CONFIG.map((cfg) => {
        const cant = counts[cfg.tipo];
        if (cant === 0) return null;
        return (
          <button
            key={cfg.tipo}
            onClick={() => onNavigateTab?.(cfg.tab)}
            style={{
              background: cfg.bg, borderRadius: 10, padding: 12, color: '#333',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              transition: 'opacity 0.2s, transform 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <p style={{ fontSize: 20, margin: 0 }}>{cfg.icono}</p>
            <p style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 2px', color: cfg.color }}>{cant}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#666', margin: 0 }}>{cfg.label}</p>
          </button>
        );
      })}
    </div>
  );
}
