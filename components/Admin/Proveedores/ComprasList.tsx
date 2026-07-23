'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ProveedorCompraRow, ProveedorRow } from '@/lib/supabase/types';
import { fetchCompras, fetchProveedores, createCompra, updateCompra, deleteCompra } from '@/lib/services/admin/client';
import { CompraForm } from './CompraForm';
import { IndicadorEstado } from './ProveedorIndicadores';
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
  const [editing, setEditing] = useState<ProveedorCompraRow | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

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
    if (editing) {
      await updateCompra(editing.id, data);
      setEditing(null);
      load();
      return editing.id;
    }
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
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagada">Pagada</option>
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
              <th>Proveedor</th>
              <th>Fecha</th>
              <th>Factura</th>
              <th>Importe</th>
              <th>Pagado</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={styles.empty}>Cargando...</td></tr>
            ) : compras.length === 0 ? (
              <tr><td colSpan={7} className={styles.empty}>No hay compras registradas</td></tr>
            ) : compras.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.proveedor_nombre ?? '—'}</td>
                <td>{new Date(c.fecha).toLocaleDateString('es-AR')}</td>
                <td>{c.numero_factura ?? '—'}</td>
                <td>{formatCurrency(c.importe_total)}</td>
                <td>{formatCurrency(c.pagado ?? 0)}</td>
                <td><IndicadorEstado estado={c.estado} fecha={c.fecha} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setDetailId(c.id)} className={styles.compactBtn}>Ver</button>
                    <button onClick={() => setEditing(c)} className={styles.compactBtn}>Editar</button>
                    <button onClick={async () => {
                      if (confirm('¿Eliminar esta compra?')) {
                        await deleteCompra(c.id);
                        load();
                      }
                    }} className={styles.compactBtn} style={{ color: '#f87171' }}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showForm || editing) && (
        <CompraForm
          compra={editing}
          proveedores={proveedores}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

import { CompraDetailView } from './CompraDetailView';
