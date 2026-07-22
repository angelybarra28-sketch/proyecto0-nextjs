'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ProveedorRow } from '@/lib/supabase/types';
import { fetchProveedores, createProveedor, updateProveedor } from '@/lib/services/admin/client';
import { ProveedorForm } from './ProveedorForm';
import styles from '@/styles/Admin.module.css';

export function ProveedoresList() {
  const [proveedores, setProveedores] = useState<ProveedorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProveedorRow | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchProveedores({ estado: estadoFilter, search: search || undefined })
      .then(setProveedores)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [estadoFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: any) => {
    await createProveedor(data);
    setShowForm(false);
    load();
  };

  const handleUpdate = async (id: string, data: any) => {
    await updateProveedor(id, data);
    setEditing(null);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minHeight: 34, border: '1px solid #363330', borderRadius: 6, padding: '6px 10px', background: '#1e1d1b', color: '#f5f2ec', fontSize: 13, width: 220 }}
          />
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            style={{ minHeight: 34, border: '1px solid #363330', borderRadius: 6, padding: '6px 10px', background: '#1e1d1b', color: '#f5f2ec', fontSize: 13 }}
          >
            <option value="todos">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
        <button onClick={() => setShowForm(true)} className={styles.compactBtn}>
          + Nuevo Proveedor
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>WhatsApp</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className={styles.empty}>Cargando...</td></tr>
            ) : proveedores.length === 0 ? (
              <tr><td colSpan={6} className={styles.empty}>No hay proveedores</td></tr>
            ) : proveedores.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                <td>{p.telefono ?? '—'}</td>
                <td>{p.whatsapp ?? '—'}</td>
                <td>{p.email ?? '—'}</td>
                <td>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    background: p.estado === 'activo' ? '#d1fae5' : '#fee2e2',
                    color: p.estado === 'activo' ? '#065f46' : '#991b1b',
                  }}>
                    {p.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <button onClick={() => setEditing(p)} className={styles.compactBtn}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showForm || editing) && (
        <ProveedorForm
          proveedor={editing}
          onSave={async (data) => {
            if (editing) await handleUpdate(editing.id, data);
            else await handleCreate(data);
          }}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
