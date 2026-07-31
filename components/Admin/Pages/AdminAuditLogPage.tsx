'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import { fetchAuditLogs, fetchAuditActions, fetchAuditEntities } from '@/lib/services/admin/audit-client';
import type { AuditLogRow, AuditLogFilters } from '@/lib/services/admin/auditService';
import styles from '@/styles/Admin.module.css';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function describeAction(row: AuditLogRow): string {
  const meta = row.metadata ?? {};
  switch (row.action) {
    case 'product_created': return `"${meta.name ?? ''}" creado`;
    case 'product_updated': return `Campos: ${(meta.updatedFields as string[] ?? []).join(', ')}`;
    case 'product_deleted': return `ID: ${row.entity_id}`;
    case 'product_trashed': return `"${meta.name ?? ''}" movido a la papelera${meta.reason ? ` — Motivo: ${meta.reason}` : ''}`;
    case 'product_restored': return `"${meta.name ?? ''}" restaurado desde la papelera`;
    case 'product_hard_deleted': return `"${meta.name ?? ''}" eliminado definitivamente`;
    case 'product_price_changed': return `Precio: $${Number(meta.oldPrice ?? 0).toFixed(2)} → $${Number(meta.newPrice ?? 0).toFixed(2)}${meta.reason ? ` — Motivo: ${meta.reason}` : ''}`;
    case 'product_image_uploaded': return `Imagen subida`;
    case 'product_image_deleted': return `Imagen eliminada`;
    case 'category_created': return `"${meta.name ?? ''}" creada`;
    case 'category_updated': return `Campos: ${(meta.updatedFields as string[] ?? []).join(', ')}`;
    case 'category_deleted': return `ID: ${row.entity_id}`;
    case 'sale_updated': return `Estado: ${meta.saleStatus ?? '—'}`;
    case 'payment_registered': return `$${Number(meta.amount ?? 0).toFixed(2)} — ${meta.paymentMethod ?? ''}`;
    case 'customer_created': return `"${meta.fullName ?? ''}"`;
    case 'customer_user_linked': return `→ ${meta.userId ?? ''}`;
    case 'user_activated': return `Activado`;
    case 'user_deactivated': return `Desactivado`;
    case 'credit_account_created': return `Cuotas: ${meta.installmentCount ?? '?'}`;
    case 'credit_payment_registered': return `$${Number(meta.amount ?? 0).toFixed(2)}`;
    case 'collection_note_added': return `${meta.contactType ?? ''}: ${meta.result ?? ''}`;
    case 'credit_installments_fixed': return `${meta.installmentCount ?? 0} cuotas`;
    case 'credit_portfolio_cleaned': return `${meta.accountsDeleted ?? 0} cuentas`;
    case 'portfolio_imported': return `${meta.importedCount ?? 0} filas`;
    case 'portfolio_preview': return `${meta.rowCount ?? 0} filas — "${meta.fileName ?? ''}"`;
    case 'proveedor_created': return `"${meta.nombre ?? ''}"`;
    case 'proveedor_updated': return `Campos: ${(meta.updatedFields as string[] ?? []).join(', ')}`;
    case 'proveedor_pago_created': return `$${Number(meta.monto ?? 0).toFixed(2)}`;
    case 'proveedor_pago_deleted': return `ID: ${row.entity_id}`;
    case 'proveedor_compra_created': return `$${Number(meta.importeTotal ?? 0).toFixed(2)}`;
    case 'proveedor_compra_updated': return `Campos: ${(meta.updatedFields as string[] ?? []).join(', ')}`;
    case 'proveedor_compra_deleted': return `ID: ${row.entity_id}`;
    case 'proveedor_compra_items_created': return `${meta.itemCount ?? 0} items`;
    case 'proveedor_compra_item_deleted': return `ID: ${row.entity_id}`;
    case 'proveedor_adjunto_uploaded': return `"${meta.nombreOriginal ?? ''}" (${meta.tipo ?? ''})`;
    case 'proveedor_adjunto_deleted': return `ID: ${row.entity_id}`;
    case 'backup_exported': return `versión ${meta.version ?? '?'} · ${meta.tables ?? '?'} tablas · ${meta.rows ?? '?'} filas`;
    case 'backup_validated': return meta.result === 'ok' ? 'Backup válido' : `Errores: ${meta.errorCount ?? '?'}`;
    case 'backup_restore_started': return `modo ${meta.mode ?? '?'} · versión ${meta.version ?? '?'}`;
    case 'backup_restored': return `modo ${meta.mode ?? '?'} · ${meta.tables ?? '?'} tablas · ${meta.rows ?? '?'} filas · ${meta.durationMs ?? '?'} ms`;
    case 'backup_restore_failed': return `modo ${meta.mode ?? '?'} · errores: ${Array.isArray(meta.errors) ? meta.errors.length : meta.errorCount ?? '?'} · rollback: ${meta.rollbackApplied ? 'sí' : 'no'}`;
    default: return row.action;
  }
}

function DetailModal({ row, onClose }: { row: AuditLogRow | null; onClose: () => void }) {
  if (!row) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#262422', borderRadius: 12, padding: 24, maxWidth: 560, width: '90%',
          border: '1px solid #363330', color: '#f5f2ec', maxHeight: '80vh', overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 18, color: '#f5f2ec' }}>Detalle del Log</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {[
              ['Fecha', formatDate(row.created_at)],
              ['Usuario', row.admin_user_id ?? '—'],
              ['Acción', row.action],
              ['Entidad', row.entity],
              ['ID Entidad', row.entity_id ?? '—'],
              ['Metadata', row.metadata && Object.keys(row.metadata).length > 0
                ? JSON.stringify(row.metadata, null, 2)
                : '—'],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid #363330' }}>
                <td style={{ padding: '8px 12px 8px 0', fontWeight: 600, color: '#d3cdc4', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  {label}
                </td>
                <td style={{ padding: 8, color: '#f5f2ec', whiteSpace: label === 'Metadata' ? 'pre-wrap' : undefined, fontFamily: label === 'Metadata' ? 'monospace' : undefined, fontSize: label === 'Metadata' ? 11 : 13 }}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button
            onClick={onClose}
            className={styles.compactBtn}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminAuditLogPage() {
  const { isAdmin } = useAdminAccess();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [detailRow, setDetailRow] = useState<AuditLogRow | null>(null);
  const loaded = useRef(false);

  const loadFilters = useCallback(async () => {
    try {
      const [a, e] = await Promise.all([fetchAuditActions(), fetchAuditEntities()]);
      setActions(a);
      setEntities(e);
    } catch { }
  }, []);

  const loadLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const filters: AuditLogFilters = { page: p, pageSize };
      if (filterAction) filters.action = filterAction;
      if (filterEntity) filters.entity = filterEntity;
      if (filterDateFrom) filters.dateFrom = filterDateFrom;
      if (filterDateTo) filters.dateTo = filterDateTo;
      const result = await fetchAuditLogs(filters);
      setLogs(result.logs);
      setTotalCount(result.totalCount);
      setPage(result.page);
    } catch { } finally {
      setLoading(false);
    }
  }, [pageSize, filterAction, filterEntity, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!loaded.current) {
      loaded.current = true;
      loadFilters();
    }
    loadLogs(1);
  }, [isAdmin, loadFilters, loadLogs]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Auditoría</h1>

      <div className={styles.sections}>
        <div className={styles.section}>
          <div className={styles.adminTableToolbar}>
            <label>
              Acción
              <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}>
                <option value="">Todas</option>
                {actions.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label>
              Entidad
              <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}>
                <option value="">Todas</option>
                {entities.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label>
              Desde
              <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }} />
            </label>
            <label>
              Hasta
              <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }} />
            </label>
            <label style={{ justifyContent: 'flex-end' }}>
              &nbsp;
              <button className={styles.compactBtn} onClick={() => {
                setFilterAction(''); setFilterEntity(''); setFilterDateFrom(''); setFilterDateTo(''); setPage(1);
              }}>
                Limpiar
              </button>
            </label>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Descripción</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className={styles.empty}>Cargando...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} className={styles.empty}>No se encontraron registros</td></tr>
                ) : logs.map((row) => (
                  <tr key={row.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                    <td style={{ fontSize: 11, fontFamily: 'monospace', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.admin_user_id ? `${row.admin_user_id.slice(0, 8)}...` : '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{row.action}</td>
                    <td>{row.entity}</td>
                    <td style={{ color: '#d3cdc4', fontSize: 11 }}>{describeAction(row)}</td>
                    <td>
                      <button className={styles.compactBtn} onClick={() => setDetailRow(row)}>
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.adminPagination}>
              <span>{totalCount} registros — Pág. {page} de {totalPages}</span>
              <div className={styles.adminPaginationPages}>
                {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      className={`${styles.compactBtn} ${p === page ? styles.adminPaginationActive : ''}`}
                      onClick={() => loadLogs(p)}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>

      <DetailModal row={detailRow} onClose={() => setDetailRow(null)} />
    </div>
  );
}
