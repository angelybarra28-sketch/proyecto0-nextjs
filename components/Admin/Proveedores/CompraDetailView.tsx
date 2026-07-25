'use client';

import { useEffect, useState } from 'react';
import type { ProveedorCompraRow, ProveedorCompraItemRow, ProveedorPagoRow, ProveedorAdjuntoRow } from '@/lib/supabase/types';
import { fetchCompraDetail, createCompraItems, deleteCompraItem, uploadProveedorAdjunto, deleteProveedorAdjunto } from '@/lib/services/admin/client';
import { IndicadorEstadoBadge } from './ProveedorIndicadores';
import { RegistrarPagoModal } from './RegistrarPagoModal';
import styles from '@/styles/Admin.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

type Props = {
  compraId: string;
  onBack: () => void;
  onUpdated: () => void;
};

export function CompraDetailView({ compraId, onBack, onUpdated }: Props) {
  const [data, setData] = useState<{ compra: ProveedorCompraRow; items: ProveedorCompraItemRow[]; pagos: ProveedorPagoRow[]; adjuntos: ProveedorAdjuntoRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<{ descripcion: string; cantidad: string; costo_unitario: string; subtotal: string }[]>([]);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchCompraDetail(compraId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [compraId]);

  const addItemRow = () => {
    setItems([...items, { descripcion: '', cantidad: '1', costo_unitario: '0', subtotal: '0' }]);
  };

  const updateItem = (i: number, field: string, value: string) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    if (field === 'cantidad' || field === 'costo_unitario') {
      const qty = Number(next[i].cantidad) || 0;
      const price = Number(next[i].costo_unitario) || 0;
      next[i].subtotal = (qty * price).toFixed(2);
    }
    setItems(next);
  };

  const saveItems = async () => {
    const valid = items.filter((i) => i.descripcion.trim() && Number(i.cantidad) > 0);
    if (valid.length === 0) return;
    await createCompraItems(valid.map((i) => ({
      compra_id: compraId,
      descripcion: i.descripcion.trim(),
      cantidad: Number(i.cantidad),
      costo_unitario: Number(i.costo_unitario),
      subtotal: Number(i.subtotal),
    })));
    setItems([]);
    load();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadProveedorAdjunto(compraId, file, 'factura');
      load();
    } catch (err) {
      console.error('Error uploading:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAdjunto = async (id: string) => {
    if (!confirm('¿Eliminar este archivo?')) return;
    try {
      await deleteProveedorAdjunto(id);
      load();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  if (loading) return <p className={styles.empty}>Cargando detalle...</p>;
  if (!data) return <p className={styles.empty}>No se encontró la compra</p>;

  const { compra, items: compraItems, pagos, adjuntos } = data;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <button onClick={onBack} className={styles.compactBtn}>
          ← Volver a Compras
        </button>
        <button onClick={() => setShowPagoModal(true)} className={styles.compactBtn} style={{ color: '#c8a87c' }}>
          Registrar Pago
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
        <div style={{ background: '#262422', borderRadius: 10, padding: 12, border: '1px solid #363330' }}>
          <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>Factura</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 15, color: '#f5f2ec' }}>{compra.numero_factura ?? '—'}</p>
        </div>
        <div style={{ background: '#262422', borderRadius: 10, padding: 12, border: '1px solid #363330' }}>
          <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>Proveedor</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 15, color: '#f5f2ec' }}>{compra.proveedor_nombre ?? '—'}</p>
        </div>
        <div style={{ background: '#262422', borderRadius: 10, padding: 12, border: '1px solid #363330' }}>
          <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>Fecha</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 15, color: '#f5f2ec' }}>{new Date(compra.fecha).toLocaleDateString('es-AR')}</p>
        </div>
        <div style={{ background: '#262422', borderRadius: 10, padding: 12, border: '1px solid #363330' }}>
          <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>Total</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 15, color: '#f5f2ec' }}>{formatCurrency(compra.importe_total)}</p>
        </div>
        <div style={{ background: '#262422', borderRadius: 10, padding: 12, border: '1px solid #363330' }}>
          <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>Pagado</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 15, color: '#22c55e' }}>{formatCurrency(compra.pagado ?? 0)}</p>
        </div>
        <div style={{ background: '#262422', borderRadius: 10, padding: 12, border: '1px solid #363330' }}>
          <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>Saldo</p>
          <p style={{
            fontWeight: 700, margin: '4px 0 0', fontSize: 15,
            color: (compra.saldo ?? 0) > 0 ? '#f87171' : '#22c55e',
          }}>
            {formatCurrency(compra.saldo ?? 0)}
          </p>
        </div>
        <div style={{ background: '#262422', borderRadius: 10, padding: 12, border: '1px solid #363330' }}>
          <p style={{ fontSize: 11, color: '#8a7e72', margin: 0 }}>Estado</p>
          <p style={{ margin: '4px 0 0' }}><IndicadorEstadoBadge estado={compra.estado} /></p>
        </div>
      </div>

      {compra.observaciones && (
        <div style={{ marginBottom: 16, padding: 12, background: '#1e1d1b', borderRadius: 8, color: '#d3cdc4', fontSize: 13 }}>
          <strong>Observaciones:</strong> {compra.observaciones}
        </div>
      )}

      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f5f2ec', marginBottom: 10 }}>Artículos</h3>
      <div className={styles.tableContainer} style={{ marginBottom: 16 }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Costo Unit.</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {compraItems.map((item) => (
              <tr key={item.id}>
                <td>{item.descripcion}</td>
                <td>{item.cantidad}</td>
                <td>{formatCurrency(item.costo_unitario)}</td>
                <td>{formatCurrency(item.subtotal)}</td>
                <td>
                  <button onClick={() => deleteCompraItem(item.id).then(load)} className={styles.compactBtn} style={{ color: '#f87171' }}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {items.map((item, i) => (
              <tr key={`new-${i}`}>
                <td><input value={item.descripcion} onChange={(e) => updateItem(i, 'descripcion', e.target.value)} placeholder="Descripción" style={{ width: '100%', background: '#1e1d1b', color: '#f5f2ec', border: '1px solid #363330', borderRadius: 4, padding: '4px 6px', fontSize: 12 }} /></td>
                <td><input type="number" step="0.01" min="0" value={item.cantidad} onChange={(e) => updateItem(i, 'cantidad', e.target.value)} style={{ width: 70, background: '#1e1d1b', color: '#f5f2ec', border: '1px solid #363330', borderRadius: 4, padding: '4px 6px', fontSize: 12 }} /></td>
                <td><input type="number" step="0.01" min="0" value={item.costo_unitario} onChange={(e) => updateItem(i, 'costo_unitario', e.target.value)} style={{ width: 90, background: '#1e1d1b', color: '#f5f2ec', border: '1px solid #363330', borderRadius: 4, padding: '4px 6px', fontSize: 12 }} /></td>
                <td>{formatCurrency(Number(item.subtotal))}</td>
                <td>
                  <button onClick={() => setItems(items.filter((_, j) => j !== i))} className={styles.compactBtn} style={{ color: '#f87171' }}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={addItemRow} className={styles.compactBtn}>+ Agregar Artículo</button>
        {items.some((i) => i.descripcion.trim()) && (
          <button onClick={saveItems} className={`${styles.compactBtn} ${styles.primary}`}>Guardar Artículos</button>
        )}
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f5f2ec', marginBottom: 10 }}>Adjuntos</h3>
      <div style={{ marginBottom: 16 }}>
        <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #5a5248', borderRadius: 6, color: '#f5f2ec', fontSize: 13 }}>
          {uploading ? 'Subiendo...' : '+ Subir Factura / Remito'}
          <input type="file" accept="image/*,.pdf" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
        </label>
      </div>
      {adjuntos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {adjuntos.map((a) => (
            <div key={a.id} style={{ background: '#262422', border: '1px solid #363330', borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: '#c8a87c', fontSize: 12, textDecoration: 'none' }}>
                {a.nombre_original ?? 'Archivo'}
              </a>
              <button onClick={() => handleDeleteAdjunto(a.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f5f2ec', marginBottom: 10 }}>
        Historial de Pagos ({pagos.length})
      </h3>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Forma de Pago</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {pagos.length === 0 ? (
              <tr><td colSpan={4} className={styles.empty}>Sin pagos registrados</td></tr>
            ) : pagos.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.fecha).toLocaleDateString('es-AR')}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(p.monto)}</td>
                <td style={{ textTransform: 'capitalize' }}>{p.forma_pago}</td>
                <td>{p.observaciones ?? '—'}</td>
              </tr>
            ))}
            {pagos.length > 0 && (
              <tr style={{ background: '#262422' }}>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td style={{ fontWeight: 700 }}>{formatCurrency(pagos.reduce((s, p) => s + p.monto, 0))}</td>
                <td></td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPagoModal ? (
        <RegistrarPagoModal
          compraId={compraId}
          proveedorId={compra.proveedor_id}
          proveedorNombre={compra.proveedor_nombre ?? '—'}
          numeroFactura={compra.numero_factura ?? null}
          importeTotal={compra.importe_total}
          pagado={compra.pagado ?? 0}
          saldo={compra.saldo ?? 0}
          onSave={() => { setShowPagoModal(false); load(); onUpdated(); }}
          onClose={() => setShowPagoModal(false)}
        />
      ) : null}
    </div>
  );
}
