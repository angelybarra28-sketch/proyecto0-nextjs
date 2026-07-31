'use client';

import { useState } from 'react';
import type { AdminTrashedProduct } from '@/lib/adapters/catalogAdapter';
import styles from '@/styles/Admin.module.css';

type AdminTrashTableProps = {
  products: AdminTrashedProduct[];
  isLoading: boolean;
  isBusy: boolean;
  onRestore: (product: AdminTrashedProduct) => Promise<void>;
  onHardDelete: (product: AdminTrashedProduct) => Promise<void>;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminTrashTable({ products, isLoading, isBusy, onRestore, onHardDelete }: AdminTrashTableProps) {
  const [pendingDelete, setPendingDelete] = useState<AdminTrashedProduct | null>(null);

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Slug</th>
              <th>Categoría</th>
              <th>Fecha de eliminación</th>
              <th>Eliminado por</th>
              <th>Motivo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className={styles.empty}>Cargando papelera...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className={styles.empty}>La papelera está vacía</td></tr>
            ) : products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{product.name}</strong>
                    <span className={styles.adminReadonlyBadge} style={{ color: '#e7a76f', background: 'rgba(231, 167, 111, 0.1)' }}>
                      En papelera
                    </span>
                  </div>
                </td>
                <td><code>{product.slug}</code></td>
                <td>{product.categoryName}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(product.deletedAt)}</td>
                <td style={{ color: '#d3cdc4', fontSize: 12 }}>
                  {product.deletedByName ?? product.deletedBy ?? '—'}
                </td>
                <td style={{ color: '#d3cdc4', fontSize: 12 }}>{product.deleteReason ?? '—'}</td>
                <td>
                  <div className={styles.adminRowActions}>
                    <button
                      className={styles.adminTableActionButton}
                      disabled={isBusy}
                      onClick={() => void onRestore(product)}
                    >
                      Restaurar
                    </button>
                    <button
                      className={styles.deleteBtn}
                      disabled={isBusy}
                      onClick={() => setPendingDelete(product)}
                    >
                      Eliminar definitivamente
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pendingDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setPendingDelete(null)}
        >
          <div
            style={{
              background: '#1a1a2e',
              border: '1px solid #e74c3c',
              borderRadius: 8,
              padding: '1.5rem',
              maxWidth: 420,
              width: '90%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: '#e74c3c', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
              Esta acción NO puede deshacerse.
            </p>
            <p style={{ color: '#b8a89c', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              ¿Eliminar definitivamente?
            </p>
            <p style={{ color: '#f5f2ec', fontWeight: 600, marginBottom: '1.5rem' }}>
              {pendingDelete.name}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className={styles.deleteBtn}
                disabled={isBusy}
                onClick={() => {
                  const target = pendingDelete;
                  setPendingDelete(null);
                  void onHardDelete(target);
                }}
              >
                {isBusy ? 'Eliminando...' : 'Sí, eliminar definitivamente'}
              </button>
              <button
                className={styles.adminTableActionButton}
                disabled={isBusy}
                onClick={() => setPendingDelete(null)}
              >
                No, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
