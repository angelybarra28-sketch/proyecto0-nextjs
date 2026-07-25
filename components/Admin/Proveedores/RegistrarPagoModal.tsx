'use client';

import { useState } from 'react';
import { createPago } from '@/lib/services/admin/client';
import styles from '@/styles/Admin.module.css';

const FORMAS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

type Props = {
  compraId: string;
  proveedorId: string;
  proveedorNombre: string;
  numeroFactura: string | null;
  importeTotal: number;
  pagado: number;
  saldo: number;
  onSave: () => void;
  onClose: () => void;
};

export function RegistrarPagoModal({
  compraId,
  proveedorId,
  proveedorNombre,
  numeroFactura,
  importeTotal,
  pagado,
  saldo,
  onSave,
  onClose,
}: Props) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [monto, setMonto] = useState(String(saldo));
  const [formaPago, setFormaPago] = useState('efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const montoNum = Number(monto) || 0;
  const saldoPostPago = Math.max(0, saldo - montoNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montoNum || montoNum <= 0) return;
    setErrorMsg('');
    setSaving(true);
    try {
      await createPago({
        proveedor_id: proveedorId,
        compra_id: compraId,
        fecha,
        monto: montoNum,
        forma_pago: formaPago as any,
        observaciones: observaciones || null,
      });
      onSave();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar pago');
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
    maxWidth: 500, width: '100%', border: '1px solid #363330',
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

  const readonlyStyle: React.CSSProperties = {
    ...fieldStyle, opacity: 0.7, cursor: 'default',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, color: '#f5f2ec' }}>Registrar Pago</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, padding: 12, background: '#1e1d1b', borderRadius: 8 }}>
          <div>
            <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>Proveedor</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f2ec', margin: '2px 0 0' }}>{proveedorNombre}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>N° Factura</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f2ec', margin: '2px 0 0' }}>{numeroFactura ?? '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>Importe Original</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f2ec', margin: '2px 0 0' }}>{formatCurrency(importeTotal)}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>Total Pagado</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', margin: '2px 0 0' }}>{formatCurrency(pagado)}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>Saldo Pendiente</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f87171', margin: '2px 0 0' }}>{formatCurrency(saldo)}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>Saldo luego del pago</p>
            <p style={{
              fontSize: 14, fontWeight: 700, margin: '2px 0 0',
              color: saldoPostPago === 0 ? '#22c55e' : '#fbbf24',
            }}>
              {formatCurrency(saldoPostPago)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>
              Fecha *
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={fieldStyle} required />
            </label>
            <label style={labelStyle}>
              Monto *
              <input
                type="number" step="0.01" min="0.01" max={saldo}
                value={monto} onChange={(e) => setMonto(e.target.value)}
                style={fieldStyle} required
              />
            </label>
          </div>
          <label style={labelStyle}>
            Método de Pago *
            <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} style={fieldStyle}>
              {FORMAS_PAGO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Observaciones
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' }} />
          </label>
          {errorMsg && (
            <p style={{ color: '#f87171', fontSize: 12, margin: '4px 0', textAlign: 'center' }}>{errorMsg}</p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={onClose} className={styles.compactBtn}>Cancelar</button>
            <button type="submit" disabled={saving || !montoNum || montoNum <= 0} className={`${styles.compactBtn} ${styles.primary}`}>
              {saving ? 'Guardando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
