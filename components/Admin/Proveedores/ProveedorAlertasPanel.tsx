'use client';

import { useEffect, useState } from 'react';
import type { ProveedorAlerta, AlertaTipo } from '@/lib/supabase/types';
import { fetchProveedorAlertas } from '@/lib/services/admin/client';
import styles from '@/styles/Admin.module.css';

const TIPO_CONFIG: Record<AlertaTipo, { icono: string; label: string; bg: string; color: string }> = {
  factura_pendiente: { icono: '🔴', label: 'Factura pendiente', bg: '#fef2f2', color: '#991b1b' },
  saldo_pendiente: { icono: '🟡', label: 'Pago parcial', bg: '#fffbeb', color: '#92400e' },
  sin_movimiento: { icono: '⚪', label: 'Sin movimiento', bg: '#f9fafb', color: '#6b7280' },
  sin_factura_adjunto: { icono: '🔵', label: 'Sin factura/adjunto', bg: '#eff6ff', color: '#1e40af' },
};

export function ProveedorAlertasPanel({ onNavigateTab }: { onNavigateTab?: (tab: 'compras' | 'proveedores') => void }) {
  const [alertas, setAlertas] = useState<ProveedorAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetchProveedorAlertas()
      .then(setAlertas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (alertas.length === 0) return null;

  const agrupadas = alertas.reduce<Record<AlertaTipo, ProveedorAlerta[]>>((acc, a) => {
    if (!acc[a.tipo]) acc[a.tipo] = [];
    acc[a.tipo].push(a);
    return acc;
  }, {} as Record<AlertaTipo, ProveedorAlerta[]>);

  return (
    <div style={{ marginBottom: 20, border: '1px solid #363330', borderRadius: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', border: 'none', background: '#2a2826', color: '#f5f2ec',
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}
      >
        <span>Alertas ({alertas.length})</span>
        <span style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
      </button>

      {!collapsed && (
        <div style={{ padding: '8px 14px 14px', background: '#1e1d1b' }}>
          {(Object.entries(agrupadas) as [AlertaTipo, ProveedorAlerta[]][]).map(([tipo, items]) => {
            const cfg = TIPO_CONFIG[tipo];
            return (
              <div key={tipo} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: cfg.color, margin: '6px 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {cfg.icono} {cfg.label} ({items.length})
                </p>
                {items.slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '5px 10px', margin: '2px 0', borderRadius: 6,
                      background: cfg.bg, color: '#333', fontSize: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.proveedor_nombre}
                      </span>
                      <span style={{ fontSize: 11, color: '#666' }}>{a.descripcion}</span>
                    </div>
                    <button
                      onClick={() => onNavigateTab?.(a.link_tab)}
                      style={{
                        flexShrink: 0, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                        border: `1px solid ${cfg.color}`, borderRadius: 6,
                        background: 'transparent', color: cfg.color, cursor: 'pointer', marginLeft: 8,
                      }}
                    >
                      Ir a {a.link_tab === 'compras' ? 'Compras' : 'Proveedores'}
                    </button>
                  </div>
                ))}
                {items.length > 5 && (
                  <p style={{ fontSize: 11, color: '#8a7e72', margin: '2px 0 0 10px' }}>
                    +{items.length - 5} más
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
