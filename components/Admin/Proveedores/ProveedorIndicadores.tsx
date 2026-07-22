'use client';

import type { CompraEstado } from '@/lib/supabase/types';

const INDICATOR_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pagada: { bg: '#d1fae5', color: '#065f46', label: 'Pagada' },
  parcial: { bg: '#fef3c7', color: '#92400e', label: 'Pago parcial' },
  pendiente: { bg: '#fee2e2', color: '#991b1b', label: 'Pendiente' },
  reciente: { bg: '#dbeafe', color: '#1e40af', label: 'Reciente' },
  sin_actividad: { bg: '#f3f4f6', color: '#6b7280', label: 'Sin actividad' },
  sin_deuda: { bg: '#d1fae5', color: '#065f46', label: 'Sin deuda' },
  con_deuda: { bg: '#fee2e2', color: '#991b1b', label: 'Con deuda' },
};

export function IndicadorEstado({ estado, fecha }: { estado: CompraEstado; fecha?: string }) {
  const esReciente = fecha && diasDesde(fecha) <= 30;
  const key = estado === 'pagada' ? 'pagada' : estado === 'parcial' ? 'parcial' : 'pendiente';
  const style = INDICATOR_STYLES[key];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: style.bg, border: `2px solid ${style.color}`, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: style.color }}>{style.label}</span>
      {esReciente && (
        <span style={{ fontSize: 10, fontWeight: 500, color: '#1e40af', background: '#dbeafe', padding: '1px 5px', borderRadius: 8 }}>
          Nuevo
        </span>
      )}
    </span>
  );
}

export function IndicadorDeuda({ saldo }: { saldo: number }) {
  const key = saldo > 0 ? 'con_deuda' : 'sin_deuda';
  const style = INDICATOR_STYLES[key];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: style.bg, border: `2px solid ${style.color}`, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: style.color }}>{style.label}</span>
    </span>
  );
}

export function IndicadorActividad({ ultimaFecha }: { ultimaFecha?: string | null }) {
  if (!ultimaFecha) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f3f4f6', border: '2px solid #6b7280', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>Sin actividad</span>
      </span>
    );
  }

  const dsd = diasDesde(ultimaFecha);
  if (dsd <= 30) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dbeafe', border: '2px solid #1e40af', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1e40af' }}>Reciente</span>
      </span>
    );
  }

  if (dsd > 90) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f3f4f6', border: '2px solid #6b7280', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>Sin actividad</span>
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fef3c7', border: '2px solid #92400e', flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: '#92400e' }}>Activo</span>
    </span>
  );
}

function diasDesde(fechaStr: string): number {
  const fecha = new Date(fechaStr);
  const hoy = new Date();
  const diff = hoy.getTime() - fecha.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
