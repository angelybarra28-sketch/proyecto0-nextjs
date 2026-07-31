export async function downloadBackup(): Promise<string> {
  const response = await fetch('/api/admin/backup/export', {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || 'Error al generar backup');
  }

  const blob = await response.blob();

  const disposition = response.headers.get('Content-Disposition');
  const match = disposition?.match(/filename=(.+)/);
  const filename = match?.[1] ?? `backup-${new Date().toISOString().slice(0, 16).replace('T', '-')}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}

export interface ValidationSummary {
  tables: number;
  rows: number;
  checksum: string;
  version: string;
  exportedAt: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: ValidationSummary;
}

export async function validateBackupFile(file: File): Promise<ValidationResponse> {
  const text = await file.text();

  const response = await fetch('/api/admin/backup/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: text,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || 'Error al validar backup');
  }

  return response.json();
}

export interface RestoreTableStats {
  table: string;
  backupRows: number;
  inserted: number;
  updated: number;
  ignored: number;
}

export interface RestoreSnapshotInfo {
  manifest: {
    version: string;
    exportedAt: string;
    projectUrl: string;
    tables: string[];
    rowCounts: Record<string, number>;
    appVersion: string;
  };
  data: Record<string, unknown[]>;
}

export interface RestoreResult {
  success: boolean;
  mode: 'merge' | 'replace';
  version: string;
  checksum: string;
  durationMs: number;
  tables: RestoreTableStats[];
  totalInserted: number;
  totalUpdated: number;
  totalIgnored: number;
  warnings: string[];
  errors: string[];
  snapshot?: RestoreSnapshotInfo;
  rollbackApplied: boolean;
}

export async function restoreBackupFile(
  mode: 'merge' | 'replace',
  backupText: string
): Promise<RestoreResult> {
  const response = await fetch('/api/admin/backup/restore', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'X-Restore-Mode': mode,
    },
    body: backupText,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || 'Error al restaurar backup');
  }

  return response.json();
}

export type BackupHistoryAction =
  | 'backup_exported'
  | 'backup_validated'
  | 'backup_restore_started'
  | 'backup_restored'
  | 'backup_restore_failed';

export interface BackupHistoryRow {
  id: string;
  admin_user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BackupHistoryStats {
  lastBackup: string | null;
  lastRestore: string | null;
  backupCount: number;
  restoreCount: number;
  failedCount: number;
}

export interface BackupHistoryResponse {
  logs: BackupHistoryRow[];
  totalCount: number;
  stats: BackupHistoryStats;
}

export async function fetchBackupHistory(signal?: AbortSignal): Promise<BackupHistoryResponse> {
  const response = await fetch('/api/admin/backup/history', { signal });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || 'Error al cargar el historial de backups');
  }

  return response.json();
}
