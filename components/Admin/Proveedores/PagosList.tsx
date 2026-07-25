'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ProveedorCompraRow } from '@/lib/supabase/types';
import { fetchCompras } from '@/lib/services/admin/client';
import { IndicadorEstadoBadge } from './ProveedorIndicadores';
import { RegistrarPagoModal } from './RegistrarPagoModal';
import { CompraDetailView } from './CompraDetailView';
import styles from '@/styles/Admin.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

export function PagosList() {
  const [compras, setCompras] = useState<ProveedorCompraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagoCompra, setPagoCompra] = useState<ProveedorCompraRow | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchCompras({ solo_pendientes: true })
      .then(setCompras)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (detalleId) {
    return (
      <CompraDetailView
        compraId={detalleId}
        onBack={() => setDetalleId(null)}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f5f2ec', margin: 0 }}>
          Facturas Pendientes ({compras.length})
        </h3>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Factura</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Saldo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={styles.empty}>Cargando...</td></tr>
            ) : compras.length === 0 ? (
              <tr><td colSpan={8} className={styles.empty}>No hay facturas pendientes</td></tr>
            ) : compras.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.fecha).toLocaleDateString('es-AR')}</td>
                <td style={{ fontWeight: 600 }}>{c.proveedor_nombre ?? '—'}</td>
                <td>{c.numero_factura ?? '—'}</td>
                <td>{formatCurrency(c.importe_total)}</td>
                <td>{formatCurrency(c.pagado ?? 0)}</td>
                <td style={{ fontWeight: 700, color: '#f87171' }}>
                  {formatCurrency(c.saldo ?? 0)}
                </td>
                <td><IndicadorEstadoBadge estado={c.estado} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setPagoCompra(c)} className={styles.compactBtn} style={{ color: '#c8a87c' }}>
                      Registrar pago
                    </button>
                    <button onClick={() => setDetalleId(c.id)} className={styles.compactBtn}>
                      Ver historial
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {registrandoPago}
    </div>
  );
}
