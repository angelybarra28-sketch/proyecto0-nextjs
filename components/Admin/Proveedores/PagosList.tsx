'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ProveedorPagoRow, ProveedorRow, ProveedorCompraRow } from '@/lib/supabase/types';
import { fetchPagos, fetchProveedores, fetchCompras, createPago, deletePago } from '@/lib/services/admin/client';
import { PagoForm } from './PagoForm';
import styles from '@/styles/Admin.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

export function PagosList() {
  const [pagos, setPagos] = useState<ProveedorPagoRow[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProveedor, setFilterProveedor] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchPagos({ proveedor_id: filterProveedor || undefined }),
      fetchProveedores(),
    ])
      .then(([p, pr]) => { setPagos(p); setProveedores(pr); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterProveedor]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: any): Promise<string> => {
    const created = await createPago(data);
    setShowForm(false);
    load();
    return created.id;
  };

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
        </div>
        <button onClick={() => setShowForm(true)} className={styles.adminActionButton}>
          + Nuevo Pago
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Forma de Pago</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className={styles.empty}>Cargando...</td></tr>
            ) : pagos.length === 0 ? (
              <tr><td colSpan={6} className={styles.empty}>No hay pagos registrados</td></tr>
            ) : pagos.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.proveedor_nombre ?? '—'}</td>
                <td>{new Date(p.fecha).toLocaleDateString('es-AR')}</td>
                <td>{formatCurrency(p.monto)}</td>
                <td style={{ textTransform: 'capitalize' }}>{p.forma_pago}</td>
                <td>{p.observaciones ?? '—'}</td>
                <td>
                  <button onClick={async () => {
                    if (confirm('¿Eliminar este pago?')) {
                      await deletePago(p.id);
                      load();
                    }
                  }} className={styles.compactBtn} style={{ color: '#f87171' }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PagoForm
          proveedores={proveedores}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
