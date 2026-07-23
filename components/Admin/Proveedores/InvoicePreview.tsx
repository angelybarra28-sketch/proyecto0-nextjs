'use client';

import { useState, useCallback } from 'react';
import type { InvoiceData } from '@/lib/invoice-reader/types';
import styles from '@/styles/Admin.module.css';
// TODO v2.0: agregar sugerencias automáticas de corrección basadas en
// el catálogo de productos: al escribir la descripción, buscar coincidencias
// en productos existentes y autocompletar presentación y precio unitario.

type InvoicePreviewProps = {
  invoice: InvoiceData;
  imageUrl?: string;
  onConfirm: (invoice: InvoiceData) => void;
  onCancel: () => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR');
  } catch {
    return iso;
  }
}

export function InvoicePreview({ invoice: initial, imageUrl, onConfirm, onCancel }: InvoicePreviewProps) {
  const [items, setItems] = useState(initial.items.map((it) => ({ ...it })));
  const [proveedor] = useState(initial.proveedor ?? '');
  const [fecha] = useState(initial.fecha ?? '');
  const [numeroFactura] = useState(initial.numeroFactura ?? '');

  const updateItem = useCallback((index: number, field: string, value: string | number) => {
    setItems((prev) => {
      const next = prev.map((item, i) => {
        if (i !== index) return { ...item };
        const updated = { ...item, [field]: field === 'descripcion' || field === 'presentacion' ? value : Number(value) || 0 };
        if (field === 'cantidad' || field === 'precioUnitario') {
          updated.subtotal = updated.cantidad * updated.precioUnitario;
        }
        return updated;
      });
      return next;
    });
  }, []);

  const addRow = useCallback(() => {
    setItems((prev) => [...prev, { cantidad: 1, descripcion: '', presentacion: '', precioUnitario: 0, subtotal: 0 }]);
  }, []);

  const deleteRow = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const duplicateRow = useCallback((index: number) => {
    setItems((prev) => {
      const original = prev[index];
      return [...prev, { ...original }];
    });
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm({
      ...initial,
      items: items.map((it) => ({ ...it })),
      total: items.reduce((s, it) => s + it.subtotal, 0),
      cantidadTotalUnidades: items.reduce((s, it) => s + it.cantidad, 0),
    });
  }, [items, onConfirm, initial]);

  const totalItems = items.length;
  const totalUnidades = items.reduce((s, it) => s + it.cantidad, 0);
  const totalImporte = items.reduce((s, it) => s + it.subtotal, 0);

  const EPS = 0.01;
  const warnings: string[] = [];
  for (const item of items) {
    const descLabel = item.descripcion || '(sin descripción)';
    if (!item.descripcion.trim()) {
      warnings.push('Una fila tiene descripción vacía.');
    }
    if (!item.presentacion.trim()) {
      warnings.push(`"${descLabel}" — no se detectó presentación.`);
    }
    if (!isFinite(item.cantidad) || item.cantidad < 1) {
      warnings.push(`"${descLabel}" — cantidad inválida (${item.cantidad}).`);
    }
    if (!isFinite(item.precioUnitario) || item.precioUnitario <= 0) {
      warnings.push(`"${descLabel}" — precio unitario es 0 o negativo.`);
    }
    if (!isFinite(item.subtotal)) {
      warnings.push(`"${descLabel}" — subtotal inválido.`);
    } else {
      const expectedSubtotal = item.cantidad * item.precioUnitario;
      if (Math.abs(item.subtotal - expectedSubtotal) > EPS) {
        warnings.push(`"${descLabel}" — subtotal inconsistente (${formatCurrency(item.subtotal)} ≠ ${formatCurrency(expectedSubtotal)}).`);
      }
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', zIndex: 1000,
    display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px 10px',
    overflowY: 'auto',
  };

  const modalStyle: React.CSSProperties = {
    background: '#262422', borderRadius: 12, padding: 24,
    maxWidth: 900, width: '100%', border: '1px solid #363330',
    marginTop: 10,
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', minHeight: 30,
    border: '1px solid #363330',
    background: '#1e1d1b', color: '#f5f2ec', borderRadius: 4,
    padding: '4px 6px', fontSize: 12, boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 2,
    fontSize: 10, fontWeight: 600, color: '#d3cdc4',
  };

  const summaryCard: React.CSSProperties = {
    background: '#1e1d1b', borderRadius: 8, padding: '10px 14px',
    border: '1px solid #363330',
  };

  const summaryValue: React.CSSProperties = {
    fontSize: 16, fontWeight: 700, color: '#f5f2ec', margin: 0,
  };

  const summaryLabel: React.CSSProperties = {
    fontSize: 10, color: '#8a7e72', margin: 0, textTransform: 'uppercase',
    letterSpacing: 0.5,
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: '#f5f2ec' }}>Vista previa de factura</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8a7e72' }}>Revisá los datos antes de confirmar</p>
          </div>
          {imageUrl && (
            <div style={{ width: 100, height: 100, borderRadius: 8, overflow: 'hidden', border: '1px solid #363330', flexShrink: 0 }}>
              <img src={imageUrl} alt="Factura" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>

        {/* Encabezado: datos generales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
          {proveedor && (
            <div style={summaryCard}>
              <p style={summaryLabel}>Proveedor</p>
              <p style={summaryValue}>{proveedor}</p>
            </div>
          )}
          {fecha && (
            <div style={summaryCard}>
              <p style={summaryLabel}>Fecha</p>
              <p style={summaryValue}>{formatDate(fecha)}</p>
            </div>
          )}
          {numeroFactura && (
            <div style={summaryCard}>
              <p style={summaryLabel}>N° Factura</p>
              <p style={summaryValue}>{numeroFactura}</p>
            </div>
          )}
          <div style={summaryCard}>
            <p style={summaryLabel}>Total detectado</p>
            <p style={{ ...summaryValue, color: '#c8a87c' }}>{formatCurrency(initial.total ?? totalImporte)}</p>
          </div>
          <div style={summaryCard}>
            <p style={summaryLabel}>Productos</p>
            <p style={summaryValue}>{totalItems} ítems</p>
          </div>
        </div>

        {/* Productos: tabla editable */}
        <div className={styles.section} style={{ padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#f5f2ec' }}>Productos</h3>
            <button onClick={addRow} className={styles.compactBtn}>+ Agregar fila</button>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Cant</th>
                  <th>Descripción</th>
                  <th style={{ width: 100 }}>Presentación</th>
                  <th style={{ width: 110 }}>Precio Unit.</th>
                  <th style={{ width: 110 }}>Subtotal</th>
                  <th style={{ width: 80 }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        type="number" min="0" step="1"
                        value={item.cantidad}
                        onChange={(e) => updateItem(i, 'cantidad', e.target.value)}
                        style={{ ...fieldStyle, textAlign: 'center' }}
                      />
                    </td>
                    <td>
                      <input
                        value={item.descripcion}
                        onChange={(e) => updateItem(i, 'descripcion', e.target.value)}
                        style={fieldStyle}
                      />
                    </td>
                    <td>
                      <input
                        value={item.presentacion}
                        onChange={(e) => updateItem(i, 'presentacion', e.target.value)}
                        style={{ ...fieldStyle, textAlign: 'center' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number" min="0" step="0.01"
                        value={item.precioUnitario}
                        onChange={(e) => updateItem(i, 'precioUnitario', e.target.value)}
                        style={{ ...fieldStyle, textAlign: 'right' }}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#c8a87c' }}>
                      {formatCurrency(item.subtotal)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => duplicateRow(i)} className={styles.compactBtn} title="Duplicar fila">⧉</button>
                        <button onClick={() => deleteRow(i)} className={styles.compactBtn} style={{ color: '#f87171' }} title="Eliminar fila">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className={styles.empty}>Sin productos. Agregá una fila.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <div style={summaryCard}>
            <p style={summaryLabel}>Artículos totales</p>
            <p style={summaryValue}>{totalUnidades}</p>
          </div>
          <div style={summaryCard}>
            <p style={summaryLabel}>Filas</p>
            <p style={summaryValue}>{totalItems}</p>
          </div>
          <div style={summaryCard}>
            <p style={summaryLabel}>Importe total</p>
            <p style={{ ...summaryValue, color: '#c8a87c' }}>{formatCurrency(totalImporte)}</p>
          </div>
        </div>

        {/* Advertencias */}
        {warnings.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, background: '#2a2724', borderRadius: 8, border: '1px solid #5a5248' }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#fbbf24' }}>Advertencias del parser</p>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#d3cdc4' }}>
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #363330', paddingTop: 16 }}>
          <button onClick={onCancel} className={styles.compactBtn}>Cancelar</button>
          <button onClick={handleConfirm} className={`${styles.compactBtn} ${styles.primary}`}>
            Confirmar y completar formulario
          </button>
        </div>
      </div>
    </div>
  );
}
