'use client';

import { useState } from 'react';
import type { ProveedorRow } from '@/lib/supabase/types';
import { uploadProveedorAdjunto } from '@/lib/services/admin/client';
import styles from '@/styles/Admin.module.css';

type PagoFormProps = {
  proveedores: ProveedorRow[];
  onSave: (data: any) => Promise<string>;
  onClose: () => void;
};

const FORMAS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
];

export function PagoForm({ proveedores, onSave, onClose }: PagoFormProps) {
  const [proveedorId, setProveedorId] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [monto, setMonto] = useState('');
  const [formaPago, setFormaPago] = useState('efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedorId || !monto) return;
    setSaving(true);
    try {
      const pagoId = await onSave({
        proveedor_id: proveedorId,
        fecha,
        monto: Number(monto),
        forma_pago: formaPago,
        observaciones: observaciones || null,
      });
      if (file) {
        setUploading(true);
        try {
          await uploadProveedorAdjunto('', file, 'factura', pagoId);
        } catch (err) {
          console.error('Error uploading file:', err);
        } finally {
          setUploading(false);
        }
      }
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
    maxWidth: 440, width: '100%', border: '1px solid #363330',
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
        <h2 style={{ margin: '0 0 16px', fontSize: 18, color: '#f5f2ec' }}>Nuevo Pago</h2>
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
              Monto *
              <input type="number" step="0.01" min="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} style={fieldStyle} required />
            </label>
          </div>
          <label style={labelStyle}>
            Forma de Pago *
            <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} style={fieldStyle}>
              {FORMAS_PAGO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Observaciones
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' }} />
          </label>
          <label style={{ ...labelStyle, cursor: 'pointer' }}>
            {file ? `Archivo: ${file.name}` : 'Adjuntar Factura (opcional)'}
            <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={onClose} className={styles.compactBtn}>Cancelar</button>
            <button type="submit" disabled={saving || uploading || !proveedorId || !monto} className={`${styles.compactBtn} ${styles.primary}`}>
              {uploading ? 'Subiendo archivo...' : saving ? 'Guardando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
