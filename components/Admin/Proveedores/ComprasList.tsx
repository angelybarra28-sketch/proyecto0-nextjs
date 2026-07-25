'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ProveedorCompraRow, ProveedorRow } from '@/lib/supabase/types';
import { fetchCompras, fetchProveedores, createCompra } from '@/lib/services/admin/client';
import { CompraForm } from './CompraForm';
import { CompraDetailView } from './CompraDetailView';
import { IndicadorEstadoBadge } from './ProveedorIndicadores';
import { RegistrarPagoModal } from './RegistrarPagoModal';
import styles from '@/styles/Admin.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

export function ComprasList() {
  const [compras, setCompras] = useState<ProveedorCompraRow[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProveedor, setFilterProveedor] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pagoCompra, setPagoCompra] = useState<ProveedorCompraRow | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchCompras({ proveedor_id: filterProveedor || undefined, estado: filterEstado !== 'todos' ? filterEstado : undefined }),
      fetchProveedores(),
    ])
      .then(([c, p]) => { setCompras(c); setProveedores(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterProveedor, filterEstado]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: any): Promise<string> => {
    const created = await createCompra(data);
    setShowForm(false);
    load();
    return created.id;
  };

  if (detailId) {
    return (
      <CompraDetailView
        compraId={detailId}
        onBack={() => setDetailId(null)}
        onUpdated={load}
      />
    );
  }

  const registrandoPago = pagoCompra ? (
    <RegistrarPagoModal
      compraId={pagoCompra.id}
      proveedorId={pagoCompra.proveedor_id}
      proveedorNombre={pagoCompra.proveedor_nombre ?? '—'}
      numeroFactura={pagoCompra.numero_factura ?? null}
      importeTotal={pagoCompra.importe_total}
      pagado={pagoCompra.pagado ?? 0}
      saldo={pagoCompra.saldo ?? 0}
      onSave={load}
      onClose={() => setPagoCompra(null)}
    />
  ) : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={filterProveedor}
            onChange={(e) => setFilterProveedor(e.target.value)}
            style={{ minHeight: 34, border: '1px solid #363330', borderRadius: 6, padding: '6px 10px', background: '#1e1d1b', color: '#f5f2ec', fontSize: 13 }}
          >
            <option value="">Todos los proveedores</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            style={{ minHeight: 34, border: '1px solid #363330', borderRadius: 6, padding: '6px 10px', background: '#1e1d1b', color: '#f5f2ec', fontSize: 13 }}
          >
            <option value="todos">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="parcial">Parciales</option>
            <option value="pagada">Pagadas</option>
          </select>
        </div>
        <button onClick={() => setShowForm(true)} className={styles.compactBtn}>
          + Nueva Compra
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Factura</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Saldo</th>
              <th>Estado</th>
              <th>Último Pago</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className={styles.empty}>Cargando...</td></tr>
            ) : compras.length === 0 ? (
              <tr><td colSpan={9} className={styles.empty}>No hay compras registradas</td></tr>
            ) : compras.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.numero_factura ?? '—'}</td>
                <td>{new Date(c.fecha).toLocaleDateString('es-AR')}</td>
                <td>{c.proveedor_nombre ?? '—'}</td>
                <td>{formatCurrency(c.importe_total)}</td>
                <td>{formatCurrency(c.pagado ?? 0)}</td>
                <td style={{ fontWeight: 700, color: (c.saldo ?? 0) > 0 ? '#f87171' : '#22c55e' }}>
                  {formatCurrency(c.saldo ?? 0)}
                </td>
                <td><IndicadorEstadoBadge estado={c.estado} /></td>
                <td style={{ fontSize: 12, color: '#8a7e72' }}>
                  {c.ultimo_pago_fecha ? new Date(c.ultimo_pago_fecha).toLocaleDateString('es-AR') : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setDetailId(c.id)} className={styles.compactBtn}>Ver detalle</button>
                    <button onClick={() => setPagoCompra(c)} className={styles.compactBtn} style={{ color: '#c8a87c' }}>
                      Registrar pago
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <CompraForm
          proveedores={proveedores}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}

      {registrandoPago}
    </div>
  );
}
