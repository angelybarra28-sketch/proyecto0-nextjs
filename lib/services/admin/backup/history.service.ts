import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { AuditLogRow } from '@/lib/services/admin/auditService';

export const BACKUP_HISTORY_ACTIONS = [
  'backup_exported',
  'backup_validated',
  'backup_restore_started',
  'backup_restored',
  'backup_restore_failed',
] as const;

export type BackupHistoryAction = (typeof BACKUP_HISTORY_ACTIONS)[number];

export type BackupHistoryStats = {
  lastBackup: string | null;
  lastRestore: string | null;
  backupCount: number;
  restoreCount: number;
  failedCount: number;
};

export type BackupHistoryResponse = {
  logs: AuditLogRow[];
  totalCount: number;
  stats: BackupHistoryStats;
};

const HISTORY_LIMIT = 500;

export async function queryBackupHistory(): Promise<BackupHistoryResponse> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      logs: [],
      totalCount: 0,
      stats: { lastBackup: null, lastRestore: null, backupCount: 0, restoreCount: 0, failedCount: 0 },
    };
  }

  const base = supabase.from('admin_audit_logs');

  const [
    logsRes,
    totalRes,
    lastBackupRes,
    lastRestoreRes,
    backupCountRes,
    restoreCountRes,
    failedRestoresRes,
    failedValidationsRes,
  ] = await Promise.all([
    base
      .select('id, admin_user_id, action, entity, entity_id, metadata, created_at')
      .in('action', BACKUP_HISTORY_ACTIONS)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT),
    base.select('id', { count: 'exact', head: true }).in('action', BACKUP_HISTORY_ACTIONS),
    base.select('created_at').eq('action', 'backup_exported').order('created_at', { ascending: false }).limit(1),
    base.select('created_at').eq('action', 'backup_restored').order('created_at', { ascending: false }).limit(1),
    base.select('id', { count: 'exact', head: true }).eq('action', 'backup_exported'),
    base.select('id', { count: 'exact', head: true }).eq('action', 'backup_restored'),
    base.select('id', { count: 'exact', head: true }).eq('action', 'backup_restore_failed'),
    base.select('id', { count: 'exact', head: true }).eq('action', 'backup_validated').eq('metadata->>valid', 'false'),
  ]);

  const failedCount =
    (failedRestoresRes.count ?? 0) + (failedValidationsRes.count ?? 0);

  return {
    logs: (logsRes.data ?? []) as AuditLogRow[],
    totalCount: totalRes.count ?? logsRes.data?.length ?? 0,
    stats: {
      lastBackup: lastBackupRes.data?.[0]?.created_at ?? null,
      lastRestore: lastRestoreRes.data?.[0]?.created_at ?? null,
      backupCount: backupCountRes.count ?? 0,
      restoreCount: restoreCountRes.count ?? 0,
      failedCount,
    },
  };
}
