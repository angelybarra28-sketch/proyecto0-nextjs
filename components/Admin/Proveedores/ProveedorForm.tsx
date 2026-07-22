'use client';

import { useState } from 'react';
import type { ProveedorRow } from '@/lib/supabase/types';

type ProveedorFormProps = {
  proveedor?: ProveedorRow | null;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
};

export function ProveedorForm({ proveedor, onSave, onClose }: ProveedorFormProps) {
  const [nombre, setNombre] = useState(proveedor?.nombre ?? '');
  const [telefono, setTelefono] = useState(proveedor?.telefono ?? '');
  const [whatsapp, setWhatsapp] = useState(proveedor?.whatsapp ?? '');
  const [email, setEmail] = useState(proveedor?.email ?? '');
  const [direccion, setDireccion] = useState(proveedor?.direccion ?? '');
  const [observaciones, setObservaciones] = useState(proveedor?.observaciones ?? '');
  const [estado, setEstado] = useState(proveedor?.estado ?? 'activo');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      await onSave({
        nombre: nombre.trim(),
        telefono: telefono || null,
        whatsapp: whatsapp || null,
        email: email || null,
        direccion: direccion || null,
        observaciones: observaciones || null,
        estado,
      });
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
    maxWidth: 520, width: '100%', border: '1px solid #363330',
    maxHeight: '90vh', overflowY: 'auto',
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
        <h2 style={{ margin: '0 0 16px', fontSize: 18, color: '#f5f2ec' }}>
          {proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        </h2>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Nombre *
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={fieldStyle} required />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>
              Teléfono
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              WhatsApp
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} style={fieldStyle} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Estado
              <select value={estado} onChange={(e) => setEstado(e.target.value as 'activo' | 'inactivo')} style={fieldStyle}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </label>
          </div>
          <label style={labelStyle}>
            Dirección
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Observaciones
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} style={{ ...fieldStyle, minHeight: 70, resize: 'vertical' }} />
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={onClose} className={styles.compactBtn}>Cancelar</button>
            <button type="submit" disabled={saving || !nombre.trim()} className={`${styles.compactBtn} ${styles.primary}`}>
              {saving ? 'Guardando...' : proveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Need to import styles inline since we use it in the component above
import styles from '@/styles/Admin.module.css';
