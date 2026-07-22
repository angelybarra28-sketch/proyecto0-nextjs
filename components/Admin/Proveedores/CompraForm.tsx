'use client';

import { useState } from 'react';
import type { ProveedorCompraRow, ProveedorRow } from '@/lib/supabase/types';
import styles from '@/styles/Admin.module.css';

type CompraFormProps = {
  compra?: ProveedorCompraRow | null;
  proveedores: ProveedorRow[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
};

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'pagada', label: 'Pagada' },
];

export function CompraForm({ compra, proveedores, onSave, onClose }: CompraFormProps) {
  const [proveedorId, setProveedorId] = useState(compra?.proveedor_id ?? '');
  const [fecha, setFecha] = useState(compra?.fecha ?? new Date().toISOString().split('T')[0]);
  const [numeroFactura, setNumeroFactura] = useState(compra?.numero_factura ?? '');
  const [importeTotal, setImporteTotal] = useState(compra ? String(compra.importe_total) : '');
  const [estado, setEstado] = useState(compra?.estado ?? 'pendiente');
  const [observaciones, setObservaciones] = useState(compra?.observaciones ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedorId || !importeTotal) return;
    setSaving(true);
    try {
      await onSave({
        proveedor_id: proveedorId,
        fecha,
        numero_factura: numeroFactura || null,
        importe_total: Number(importeTotal),
        estado,
        observaciones: observaciones || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20,
  };

  const modalStyle: React.CSSProperties = {
    background: '#262422', borderRadius: 12, padding: 24,
    maxWidth: 480, width: '100%', border: '1px solid #363330',
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', minHeight: 38, border: '1px solid #363330',
    background: '#1e1d1b', color: '#f5f2ec', borderRadius: 6,
    padding: '8px 10px', fontSize: 13, boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 4,
    fontSize: 12, fontWeight: 600, color: '#d3cdc4', marginBottom: 12,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, color: '#f5f2ec' }}>
          {compra ? 'Editar Compra' : 'Nueva Compra'}
        </h2>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Proveedor *
            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} style={fieldStyle} required>
              <option value="">Seleccionar...</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>
              Fecha *
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={fieldStyle} required />
            </label>
            <label style={labelStyle}>
              N° Factura
              <input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} style={fieldStyle} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>
              Importe Total *
              <input type="number" step="0.01" min="0" value={importeTotal} onChange={(e) => setImporteTotal(e.target.value)} style={fieldStyle} required />
            </label>
            <label style={labelStyle}>
              Estado
              <select value={estado} onChange={(e) => setEstado(e.target.value as 'pendiente' | 'parcial' | 'pagada')} style={fieldStyle}>
                {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </label>
          </div>
          <label style={labelStyle}>
            Observaciones
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' }} />
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={onClose} className={styles.compactBtn}>Cancelar</button>
            <button type="submit" disabled={saving || !proveedorId || !importeTotal} className={`${styles.compactBtn} ${styles.primary}`}>
              {saving ? 'Guardando...' : compra ? 'Guardar Cambios' : 'Crear Compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
