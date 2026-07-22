'use client';

import styles from '@/styles/Admin.module.css';

type Tab = 'dashboard' | 'proveedores' | 'compras' | 'pagos' | 'deudas' | 'estadisticas';

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'proveedores', label: 'Proveedores' },
  { key: 'compras', label: 'Compras' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'deudas', label: 'Deudas' },
  { key: 'estadisticas', label: 'Estadísticas' },
];

export type { Tab };

export function ProveedoresTabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #363330', flexWrap: 'wrap' }}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: active === tab.key ? 700 : 500,
            border: 'none',
            borderBottom: active === tab.key ? '2px solid #c8a87c' : '2px solid transparent',
            background: 'transparent',
            color: active === tab.key ? '#f5f2ec' : '#8a7e72',
            cursor: 'pointer',
            transition: 'color 0.2s, border-color 0.2s',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
