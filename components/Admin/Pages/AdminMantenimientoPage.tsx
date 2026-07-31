'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import {
  fetchMaintenanceStatus,
  runMaintenanceAction,
  isStorageCheckResult,
  type MaintenanceStatusResponse,
  type MaintenanceDiagnostic,
  type MaintenanceSystemInfo,
  type StorageCheckResult,
} from '@/lib/services/admin/maintenance-client';
import { fetchAuditLogs } from '@/lib/services/admin/audit-client';
import type { AuditLogRow } from '@/lib/services/admin/auditService';
import styles from '@/styles/Admin.module.css';

const STATUS_CLASS: Record<string, string> = {
  ok: styles.completed,
  warning: styles.pending,
  error: styles.cancelled,
};

const STATUS_LABEL: Record<string, string> = {
  ok: '✔ OK',
  warning: '⚠ Advertencia',
  error: '✖ Error',
};

const CARD_STYLE: React.CSSProperties = {
  background: '#1e1d1b',
  borderRadius: 8,
  padding: '12px 14px',
  border: '1px solid #363330',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  color: '#a39d94',
  marginBottom: 4,
};

const VALUE_STYLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: '#f5f2ec',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function shortId(id: string | null): string {
  if (!id) return '—';
  return `${id.slice(0, 8)}...`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`${styles.status} ${STATUS_CLASS[status] ?? styles.completed}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className={styles.adminTableHeader}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description && (
        <span className={styles.adminReadonlyBadge}>{description}</span>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div style={CARD_STYLE}>
      <div style={LABEL_STYLE}>{label}</div>
      <div style={VALUE_STYLE}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: '1px solid #363330' }}>
      <td style={{ padding: '8px 12px 8px 0', fontWeight: 600, color: '#d3cdc4', whiteSpace: 'nowrap' }}>{label}</td>
      <td style={{ padding: 8, color: '#f5f2ec' }}>{value}</td>
    </tr>
  );
}

export function AdminMantenimientoPage() {
  const { isAdmin } = useAdminAccess();
  const [data, setData] = useState<MaintenanceStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [runningTool, setRunningTool] = useState<string | null>(null);
  const [toolFeedback, setToolFeedback] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});
  const [storageResult, setStorageResult] = useState<StorageCheckResult | null>(null);
  const loaded = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const status = await fetchMaintenanceStatus(signal);
      setData(status);
      setStorageResult(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Error al cargar el estado del sistema');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await fetchAuditLogs({ page: 1, pageSize: 10 }, signal);
      setAuditLogs(result.logs);
    } catch {
      setAuditLogs([]);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || loaded.current) return;
    loaded.current = true;
    const controller = new AbortController();
    void load(controller.signal);
    void loadAuditLogs(controller.signal);
    return () => controller.abort();
  }, [isAdmin, load, loadAuditLogs]);

  const handleTool = useCallback(async (action: 'financial_refresh' | 'credit_overdue_refresh' | 'storage_check' | 'cache_clear') => {
    setRunningTool(action);
    setToolFeedback((prev) => ({ ...prev, [action]: { type: 'success', text: '' } }));
    setStorageResult(null);

    try {
      const result = await runMaintenanceAction(action);
      setToolFeedback((prev) => ({
        ...prev,
        [action]: { type: 'success', text: result.message },
      }));

      if (isStorageCheckResult(result.result)) {
        setStorageResult(result.result);
      }

      if (action === 'financial_refresh' || action === 'credit_overdue_refresh' || action === 'cache_clear') {
        await load();
        await loadAuditLogs();
      }
    } catch (err) {
      setToolFeedback((prev) => ({
        ...prev,
        [action]: { type: 'error', text: err instanceof Error ? err.message : 'Error al ejecutar la acción' },
      }));
    } finally {
      setRunningTool(null);
    }
  }, [load, loadAuditLogs]);

  const handleRunDiagnostics = useCallback(async () => {
    setRunningTool('diagnostics');
    setToolFeedback((prev) => ({ ...prev, diagnostics: { type: 'success', text: '' } }));

    try {
      await runMaintenanceAction('diagnostics');
      await load();
      await loadAuditLogs();
      setToolFeedback((prev) => ({
        ...prev,
        diagnostics: { type: 'success', text: 'Diagnóstico ejecutado correctamente' },
      }));
    } catch (err) {
      setToolFeedback((prev) => ({
        ...prev,
        diagnostics: { type: 'error', text: err instanceof Error ? err.message : 'Error al ejecutar el diagnóstico' },
      }));
    } finally {
      setRunningTool(null);
    }
  }, [load, loadAuditLogs]);

  if (!isAdmin) return null;

  const systemInfo: MaintenanceSystemInfo | null = data?.systemInfo ?? null;
  const diagnostics: MaintenanceDiagnostic[] = data?.diagnostics ?? [];
  const toolButtonStyle: React.CSSProperties = {
    minHeight: 44,
    width: 'auto',
    padding: '10px 20px',
    borderRight: 'none',
    borderRadius: 8,
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Centro de Mantenimiento</h1>
      <p style={{ color: '#d3cdc4', fontSize: 14, marginBottom: 16 }}>
        Revisión del estado del sistema y ejecución de tareas de mantenimiento.
      </p>

      {error && <div className={styles.adminAlertError}>{error}</div>}

      {loading && !data && (
        <div className={styles.section}>
          <p className={styles.empty}>Cargando estado del sistema...</p>
        </div>
      )}

      {data && (
        <div className={styles.sections}>
          <div className={styles.section}>
            <SectionHeader title="Estado del sistema" description="Datos obtenidos desde Supabase" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              <Card label="Productos" value={data.status.counts.products.toLocaleString()} />
              <Card label="Categorías" value={data.status.counts.categories.toLocaleString()} />
              <Card label="Clientes" value={data.status.counts.customers.toLocaleString()} />
              <Card label="Ventas" value={data.status.counts.sales.toLocaleString()} />
              <Card label="Cuentas corrientes" value={data.status.counts.creditAccounts.toLocaleString()} />
              <Card label="Proveedores" value={data.status.counts.proveedores.toLocaleString()} />
            </div>
          </div>

          <div className={styles.section}>
            <SectionHeader title="Estado de backups" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              <Card label="Último backup" value={formatDate(data.status.backups.lastBackup)} />
              <Card label="Última restauración" value={formatDate(data.status.backups.lastRestore)} />
              <Card label="Backups realizados" value={data.status.backups.backupCount.toLocaleString()} />
              <Card label="Restauraciones" value={data.status.backups.restoreCount.toLocaleString()} />
            </div>
          </div>

          <div className={styles.section}>
            <SectionHeader title="Estado de la papelera" />
            <div className={styles.actionButtonsRow} style={{ maxWidth: 420 }}>
              <Card label="Productos en papelera" value={data.status.trash.productsInTrash.toLocaleString()} />
              <Link href="/admin/productos/papelera" style={{ alignSelf: 'flex-end' }}>
                <button className={styles.adminActionButton} style={{ minHeight: 44, padding: '10px 20px' }}>
                  Abrir papelera
                </button>
              </Link>
            </div>
          </div>

          <div className={styles.section}>
            <SectionHeader title="Estado de auditoría" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              <Card label="Cantidad de logs" value={data.status.audit.logCount.toLocaleString()} />
              <Card label="Última acción" value={data.status.audit.lastAction ?? '—'} />
              <Card label="Usuario" value={data.status.audit.lastActionUser ?? shortId(null)} />
              <Card label="Fecha" value={formatDate(data.status.audit.lastActionDate)} />
            </div>
          </div>

          <div className={styles.section}>
            <SectionHeader title="Diagnóstico del sistema" description="Comprobaciones de solo lectura" />
            {toolFeedback.diagnostics?.text && (
              <div className={toolFeedback.diagnostics.type === 'success' ? styles.adminAlertSuccess : styles.adminAlertError}>
                {toolFeedback.diagnostics.text}
              </div>
            )}
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Verificación</th>
                    <th>Cantidad</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.length === 0 ? (
                    <tr><td colSpan={4} className={styles.empty}>Sin datos</td></tr>
                  ) : diagnostics.map((d) => (
                    <tr key={d.key}>
                      <td>
                        {d.label}
                        {d.detail && (
                          <div style={{ fontSize: 11, color: '#a39d94' }}>{d.detail}</div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{d.count.toLocaleString()}</td>
                      <td><StatusBadge status={d.status} /></td>
                      <td>
                        {d.action && (
                          <Link href={d.action.href}>
                            <button className={styles.compactBtn}>{d.action.label}</button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.backLink} style={{ marginTop: 12, textAlign: 'left' }}>
              <button
                className={styles.adminActionButton}
                onClick={() => void handleRunDiagnostics()}
                disabled={runningTool === 'diagnostics'}
                style={toolButtonStyle}
              >
                {runningTool === 'diagnostics' ? 'Ejecutando...' : 'Ejecutar diagnóstico'}
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <SectionHeader title="Herramientas" />
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Herramienta</th>
                    <th>Descripción</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Recalcular estados financieros</td>
                    <td style={{ color: '#d3cdc4', fontSize: 12 }}>Ejecuta refresh_financial_statuses()</td>
                    <td>
                      <button
                        className={styles.adminActionButton}
                        onClick={() => void handleTool('financial_refresh')}
                        disabled={runningTool === 'financial_refresh'}
                        style={toolButtonStyle}
                      >
                        {runningTool === 'financial_refresh' ? 'Ejecutando...' : 'Ejecutar'}
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Recalcular mora</td>
                    <td style={{ color: '#d3cdc4', fontSize: 12 }}>Ejecuta refresh_credit_overdue()</td>
                    <td>
                      <button
                        className={styles.adminActionButton}
                        onClick={() => void handleTool('credit_overdue_refresh')}
                        disabled={runningTool === 'credit_overdue_refresh'}
                        style={toolButtonStyle}
                      >
                        {runningTool === 'credit_overdue_refresh' ? 'Ejecutando...' : 'Ejecutar'}
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Verificar Storage</td>
                    <td style={{ color: '#d3cdc4', fontSize: 12 }}>
                      Comprueba buckets y archivos contra las referencias en base de datos
                    </td>
                    <td>
                      <button
                        className={styles.adminActionButton}
                        onClick={() => void handleTool('storage_check')}
                        disabled={runningTool === 'storage_check'}
                        style={toolButtonStyle}
                      >
                        {runningTool === 'storage_check' ? 'Verificando...' : 'Verificar'}
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Limpiar caché</td>
                    <td style={{ color: '#d3cdc4', fontSize: 12 }}>
                      Invalida la caché del dashboard (revalidateTag)
                    </td>
                    <td>
                      <button
                        className={styles.adminActionButton}
                        onClick={() => void handleTool('cache_clear')}
                        disabled={runningTool === 'cache_clear'}
                        style={toolButtonStyle}
                      >
                        {runningTool === 'cache_clear' ? 'Limpiando...' : 'Limpiar'}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {(Object.entries(toolFeedback) as Array<[string, { type: 'success' | 'error'; text: string }]>)
              .filter(([, feedback]) => feedback.text)
              .map(([tool, feedback]) => (
                <div key={tool} className={feedback.type === 'success' ? styles.adminAlertSuccess : styles.adminAlertError} style={{ marginTop: 8 }}>
                  {feedback.text}
                </div>
              ))}

            {storageResult && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ color: '#d3cdc4', fontSize: 14, marginBottom: 6 }}>
                  Resultado de la verificación: <StatusBadge status={storageResult.status} />
                </h3>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Bucket</th>
                        <th>Existe</th>
                        <th>Archivos</th>
                        <th>Referencias en BD</th>
                        <th>Estado</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storageResult.buckets.map((bucket) => (
                        <tr key={bucket.bucket}>
                          <td style={{ whiteSpace: 'nowrap' }}>{bucket.bucket}</td>
                          <td>{bucket.exists ? 'Sí' : 'No'}</td>
                          <td>{bucket.objects.toLocaleString()}</td>
                          <td>{bucket.referencedInDb.toLocaleString()}</td>
                          <td><StatusBadge status={bucket.status} /></td>
                          <td style={{ color: '#d3cdc4', fontSize: 12 }}>{bucket.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Card label="Total archivos" value={storageResult.totalObjects.toLocaleString()} />
                </div>
              </div>
            )}
          </div>

          {systemInfo && (
            <div className={styles.section}>
              <SectionHeader title="Información del sistema" />
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <tbody>
                    <InfoRow label="Versión de la aplicación" value={systemInfo.appVersion} />
                    <InfoRow label="Versión del backup" value={systemInfo.backupVersion} />
                    <InfoRow label="Cantidad de tablas" value={systemInfo.tableCount.toLocaleString()} />
                    <InfoRow label="Cantidad de rutas API" value={systemInfo.apiRouteCount.toLocaleString()} />
                    <InfoRow label="Fecha del build" value={systemInfo.buildDate ? formatDate(systemInfo.buildDate) : 'No disponible'} />
                    <InfoRow label="Environment" value={systemInfo.environment} />
                    <InfoRow label="Proyecto Supabase" value={systemInfo.supabaseProject ?? '—'} />
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className={styles.section}>
            <SectionHeader title="Historial rápido" description="Últimos 10 eventos de auditoría" />
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Acción</th>
                    <th>Usuario</th>
                    <th>Entidad</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan={4} className={styles.empty}>Sin eventos</td></tr>
                  ) : auditLogs.map((row) => (
                    <tr key={row.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.action}</td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{shortId(row.admin_user_id)}</td>
                      <td>{row.entity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
