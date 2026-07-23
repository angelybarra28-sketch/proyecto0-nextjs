'use client';

import { useState, useRef } from 'react';
import type { ProveedorCompraRow, ProveedorRow } from '@/lib/supabase/types';
import type { InvoiceData } from '@/lib/invoice-reader/types';
import { uploadProveedorAdjunto } from '@/lib/services/admin/client';
import { InvoicePreview } from './InvoicePreview';
import styles from '@/styles/Admin.module.css';
// TODO v2.0: al confirmar OCR, asociar automáticamente cada item de la factura
// con un producto del catálogo (por coincidencia de descripción + presentación).
// Almacenar la relación en una tabla compra_items para trazabilidad.

type CompraFormProps = {
  compra?: ProveedorCompraRow | null;
  proveedores: ProveedorRow[];
  onSave: (data: any) => Promise<string>;
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
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedorId || !importeTotal) return;
    setSaving(true);
    try {
      const compraId = await onSave({
        proveedor_id: proveedorId,
        fecha,
        numero_factura: numeroFactura || null,
        importe_total: Number(importeTotal),
        estado,
        observaciones: observaciones || null,
      });
      if (file) {
        setUploading(true);
        try {
          await uploadProveedorAdjunto(compraId, file, 'factura');
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

  const handleOcrSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setOcrFile(selectedFile);
    setOcrLoading(true);
    setOcrError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/admin/proveedores/compras/leer-factura', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error?.message ?? 'Error al procesar la factura');
      }

      const result = await response.json();
      setInvoiceData(result.data);
      setShowPreview(true);
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : 'Error inesperado al leer la factura');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleOcrConfirm = (data: InvoiceData) => {
    if (data.proveedor) {
      const match = proveedores.find(
        (p) => p.nombre.toLowerCase() === data.proveedor!.toLowerCase(),
      );
      if (match && !compra) {
        setProveedorId(match.id);
      }
    }
    if (data.fecha) setFecha(data.fecha);
    if (data.numeroFactura) setNumeroFactura(data.numeroFactura);
    const total = data.total ?? data.items.reduce((s, it) => s + it.subtotal, 0);
    if (total > 0) setImporteTotal(String(total));
    if (ocrFile) setFile(ocrFile);

    setShowPreview(false);
    setInvoiceData(null);
  };

  const handleOcrCancel = () => {
    setShowPreview(false);
    setInvoiceData(null);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#f5f2ec' }}>
            {compra ? 'Editar Compra' : 'Nueva Compra'}
          </h2>
          {!compra && (
            <>
              <input type="file" accept="image/*" ref={ocrInputRef} onChange={handleOcrSelect} style={{ display: 'none' }} />
              <button
                type="button"
                onClick={() => ocrInputRef.current?.click()}
                disabled={ocrLoading}
                className={styles.compactBtn}
                style={{ background: '#4a433a', borderColor: '#c8a87c', color: '#c8a87c' }}
              >
                {ocrLoading ? 'Leyendo factura...' : '📄 Importar factura'}
              </button>
            </>
          )}
        </div>
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
          {ocrError && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(254,226,226,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, color: '#f87171', fontSize: 12 }}>
              {ocrError}
            </div>
          )}
          <label style={{ ...labelStyle, cursor: 'pointer' }}>
            {file ? `Archivo: ${file.name}` : 'Adjuntar Factura (opcional)'}
            <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={onClose} className={styles.compactBtn}>Cancelar</button>
            <button type="submit" disabled={saving || uploading || !proveedorId || !importeTotal} className={`${styles.compactBtn} ${styles.primary}`}>
              {uploading ? 'Subiendo archivo...' : saving ? 'Guardando...' : compra ? 'Guardar Cambios' : 'Crear Compra'}
            </button>
          </div>
        </form>
      </div>

      {showPreview && invoiceData && (
        <InvoicePreview
          invoice={invoiceData}
          imageUrl={ocrFile ? URL.createObjectURL(ocrFile) : undefined}
          onConfirm={handleOcrConfirm}
          onCancel={handleOcrCancel}
        />
      )}
    </div>
  );
}
