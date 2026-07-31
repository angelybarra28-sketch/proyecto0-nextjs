'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import {
  fetchBackupHistory,
  type BackupHistoryRow,
  type BackupHistoryStats,
} from '@/lib/services/admin/backup-client';
import { fetchAdminUsers } from '@/lib/services/admin/customers-client';
import type { AdminUserView } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

const ACTION_LABELS: Record<string, string> = {
  backup_exported: 'Exportación',
  backup_validated: 'Validación',
  backup_restore_started: 'Restauración (inicio)',
  backup_restored: 'Restauración',
  backup_restore_failed: 'Restauración (fallida)',
};

type HistoryStatus = 'ok' | 'warning' | 'failed';

const CARD_STYLE: React.CSSProperties = {
  background: '#1e1d1b',
  borderRadius: 8,
  padding: '12px 14px',
  border: '1px solid #363330',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function num(meta: Record<string, unknown>, key: string): number | null {
  const value = meta[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function asString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return null;
}

function getStatus(row: BackupHistoryRow): HistoryStatus {
  const meta = row.metadata ?? {};
  if (row.action === 'backup_restore_failed') return 'failed';
  if (row.action === 'backup_validated' && meta.valid === false) return 'failed';
  if (row.action === 'backup_validated' && (num(meta, 'warnings') ?? 0) > 0) return 'warning';
  if (row.action === 'backup_restored' && (num(meta, 'warnings') ?? 0) > 0) return 'warning';
  return 'ok';
}

const STATUS_META: Record<HistoryStatus, { label: string; className: string }> = {
  ok: { label: '✔ Correcto', className: styles.completed },
  warning: { label: '⚠ Con advertencias', className: styles.pending },
  failed: { label: '✖ Falló', className: styles.cancelled },
};

function shortId(id: string | null): string {
  if (!id) return '—';
  return `${id.slice(0, 8)}...`;
}

function renderMetadata(label: string, value: unknown, meta: Record<string, unknown>): { label: string; value: string } {
  switch (label) {
    case 'mode':
      return { label: 'Modo', value: value === 'replace' ? 'Reemplazar' : 'Fusionar' };
    case 'durationMs':
      return { label: 'Duración', value: formatDuration(num(meta, 'durationMs')) };
    case 'checksum':
      return { label: 'Checksum', value: String(value ?? '—') };
    case 'tables':
    case 'exportedTables':
    case 'rows':
    case 'totalRows':
    case 'inserted':
    case 'updated':
    case 'ignored':
      return { label: METADATA_LABELS[label] ?? label, value: Number(value ?? 0).toLocaleString() };
    case 'fileSizeBytes':
      return { label: 'Tamaño', value: formatBytes(num(meta, 'fileSizeBytes')) };
    case 'valid':
      return { label: 'Válido', value: value === true ? 'Sí' : 'No' };
    case 'rollbackApplied':
      return { label: 'Rollback aplicado', value: value === true ? 'Sí' : 'No' };
    case 'warnings':
    case 'errors':
      return { label: METADATA_LABELS[label] ?? label, value: Number(value ?? 0).toLocaleString() };
    default:
      return { label: METADATA_LABELS[label] ?? label, value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—') };
  }
}

const METADATA_LABELS: Record<string, string> = {
  version: 'Versión',
  checksum: 'Checksum',
  mode: 'Modo',
  durationMs: 'Duración',
  tables: 'Tablas',
  exportedTables: 'Tablas',
  rows: 'Registros',
  totalRows: 'Registros',
  fileSizeBytes: 'Tamaño',
  inserted: 'Insertados',
  updated: 'Actualizados',
  ignored: 'Ignorados',
  warnings: 'Advertencias',
  errors: 'Errores',
  valid: 'Válido',
  rollbackApplied: 'Rollback aplicado',
};

function DetailModal({ row, userName, onClose }: { row: BackupHistoryRow | null; userName: string; onClose: () => void }) {
  if (!row) return null;

  const meta = row.metadata ?? {};
  const status = getStatus(row);
  const derivedFilename = row.action === 'backup_exported'
    ? `backup-${row.created_at.slice(0, 10)}.json`
    : null;

  const detailRows: Array<[string, string]> = [
    ['Fecha', formatDate(row.created_at)],
    ['Operación', ACTION_LABELS[row.action] ?? row.action],
    ['Usuario', userName],
  ];
  if (derivedFilename) {
    detailRows.push(['Archivo', derivedFilename]);
  }
  for (const [key, value] of Object.entries(meta)) {
    const rendered = renderMetadata(key, value, meta);
    detailRows.push([rendered.label, rendered.value]);
  }

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
          background: '#262422', borderRadius: 12, padding: 24, maxWidth: 620, width: '90%',
          border: '1px solid #363330', color: '#f5f2ec', maxHeight: '84vh', overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#f5f2ec' }}>Detalle del backup</h2>
          <span className={`${styles.status} ${STATUS_META[status].className}`}>{STATUS_META[status].label}</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {detailRows.map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid #363330' }}>
                <td style={{ padding: '8px 12px 8px 0', fontWeight: 600, color: '#d3cdc4', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  {label}
                </td>
                <td style={{ padding: 8, color: '#f5f2ec', wordBreak: 'break-all', fontSize: label === 'Checksum' ? 11 : 13, fontFamily: label === 'Checksum' ? 'monospace' : undefined }}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button onClick={onClose} className={styles.compactBtn}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminBackupHistory() {
  const { isAdmin } = useAdminAccess();
  const [logs, setLogs] = useState<BackupHistoryRow[]>([]);
  const [stats, setStats] = useState<BackupHistoryStats | null>(null);
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailRow, setDetailRow] = useState<BackupHistoryRow | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const [history, userList] = await Promise.all([
        fetchBackupHistory(signal),
        fetchAdminUsers(signal),
      ]);
      setLogs(history.logs);
      setStats(history.stats);
      setUsers(userList);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || loaded.current) return;
    loaded.current = true;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [isAdmin, load]);

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      map.set(u.id, u.nombreApellido || u.email);
    }
    return map;
  }, [users]);

  const userNameOf = useCallback(
    (row: BackupHistoryRow) => {
      const name = row.admin_user_id ? userMap.get(row.admin_user_id) : null;
      return name ? `${name} (${shortId(row.admin_user_id)})` : shortId(row.admin_user_id);
    },
    [userMap]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromDate = filterFrom ? new Date(`${filterFrom}T00:00:00`) : null;
    const toDate = filterTo ? new Date(`${filterTo}T23:59:59.999`) : null;

    return logs.filter((row) => {
      if (filterAction && row.action !== filterAction) return false;
      if (filterStatus && getStatus(row) !== filterStatus) return false;
      if (filterUser && row.admin_user_id !== filterUser) return false;

      const created = new Date(row.created_at);
      if (fromDate && created < fromDate) return false;
      if (toDate && created > toDate) return false;

      if (term) {
        const meta = row.metadata ?? {};
        const version = asString(meta, 'version') ?? '';
        const checksum = asString(meta, 'checksum') ?? '';
        const mode = asString(meta, 'mode') ?? '';
        const userName = row.admin_user_id ? userMap.get(row.admin_user_id) ?? '' : '';
        const haystack = [
          ACTION_LABELS[row.action] ?? row.action,
          row.action,
          version,
          checksum,
          mode,
          userName,
          formatDate(row.created_at),
        ].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [logs, filterAction, filterStatus, filterUser, filterFrom, filterTo, search, userMap]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  const resetPage = () => setPage(1);

  const clearFilters = () => {
    setFilterAction('');
    setFilterStatus('');
    setFilterUser('');
    setFilterFrom('');
    setFilterTo('');
    setSearch('');
    setPage(1);
  };

  if (!isAdmin) return null;

  const statCards: Array<{ label: string; value: string }> = [
    { label: 'Último Backup', value: stats?.lastBackup ? formatDate(stats.lastBackup) : '—' },
    { label: 'Última Restauración', value: stats?.lastRestore ? formatDate(stats.lastRestore) : '—' },
    { label: 'Backups creados', value: (stats?.backupCount ?? 0).toLocaleString() },
    { label: 'Restauraciones', value: (stats?.restoreCount ?? 0).toLocaleString() },
    { label: 'Fallidas', value: (stats?.failedCount ?? 0).toLocaleString() },
  ];

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Historial de Backups</h2>
      <p style={{ color: '#d3cdc4', fontSize: 14, marginBottom: 12 }}>
        Todas las exportaciones, validaciones y restauraciones registradas en la auditoría del sistema.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 16 }}>
        {statCards.map((card) => (
          <div key={card.label} style={CARD_STYLE}>
            <div style={{ fontSize: 12, color: '#a39d94', marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f5f2ec' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {error && <div className={styles.adminAlertError}>{error}</div>}

      <div className={styles.adminTableToolbar}>
        <label>
          Operación
          <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); resetPage(); }}>
            <option value="">Todas</option>
            {Object.entries(ACTION_LABELS).map(([action, label]) => (
              <option key={action} value={action}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); resetPage(); }}>
            <option value="">Todos</option>
            <option value="ok">✔ Correcto</option>
            <option value="warning">⚠ Con advertencias</option>
            <option value="failed">✖ Falló</option>
          </select>
        </label>
        <label>
          Usuario
          <select value={filterUser} onChange={(e) => { setFilterUser(e.target.value); resetPage(); }}>
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.nombreApellido || u.email}</option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); resetPage(); }} />
        </label>
        <label>
          Hasta
          <input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); resetPage(); }} />
        </label>
        <label style={{ justifyContent: 'flex-end' }}>
          Búsqueda
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            placeholder="Checksum, versión, modo..."
            style={{ minWidth: 180 }}
          />
        </label>
        <label style={{ justifyContent: 'flex-end' }}>
          &nbsp;
          <button className={styles.compactBtn} onClick={clearFilters}>
            Limpiar
          </button>
        </label>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Operación</th>
              <th>Usuario</th>
              <th>Versión</th>
              <th>Registros</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={styles.empty}>Cargando historial...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={7} className={styles.empty}>No se encontraron registros</td></tr>
            ) : pageRows.map((row) => {
              const meta = row.metadata ?? {};
              const status = getStatus(row);
              const version = asString(meta, 'version') ?? '—';
              const checksum = asString(meta, 'checksum') ?? '';
              const rows = num(meta, 'rows') ?? num(meta, 'totalRows');
              return (
                <tr key={row.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {ACTION_LABELS[row.action] ?? row.action}
                    {checksum && (
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#a39d94' }}>
                        {checksum.slice(0, 12)}…
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userNameOf(row)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{version}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{rows === null ? '—' : rows.toLocaleString()}</td>
                  <td>
                    <span className={`${styles.status} ${STATUS_META[status].className}`}>
                      {STATUS_META[status].label}
                    </span>
                  </td>
                  <td>
                    <button className={styles.compactBtn} onClick={() => setDetailRow(row)}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className={styles.adminPagination}>
          <span>{filtered.length} registros — Pág. {safePage} de {totalPages}</span>
          <div className={styles.adminPaginationPages}>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  className={`${styles.compactBtn} ${p === safePage ? styles.adminPaginationActive : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <DetailModal row={detailRow} userName={detailRow ? userNameOf(detailRow) : ''} onClose={() => setDetailRow(null)} />
    </div>
  );
}
