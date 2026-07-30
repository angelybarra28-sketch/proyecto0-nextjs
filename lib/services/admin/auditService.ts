import { getSupabaseAdminClient } from '@/lib/supabase/server';

export type AuditLogFilters = {
  page?: number;
  pageSize?: number;
  action?: string;
  entity?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type AuditLogRow = {
  id: string;
  admin_user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AuditLogResponse = {
  logs: AuditLogRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export async function queryAuditLogs(filters: AuditLogFilters): Promise<AuditLogResponse> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { logs: [], totalCount: 0, page: 1, pageSize: 50 };
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('admin_audit_logs')
    .select('id, admin_user_id, action, entity, entity_id, metadata, created_at', { count: 'exact' });

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.entity) {
    query = query.eq('entity', filters.entity);
  }

  if (filters.userId) {
    query = query.eq('admin_user_id', filters.userId);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error querying audit logs:', error);
    return { logs: [], totalCount: 0, page, pageSize };
  }

  return {
    logs: (data ?? []) as AuditLogRow[],
    totalCount: count ?? 0,
    page,
    pageSize,
  };
}

export async function listAuditActions(): Promise<string[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('admin_audit_logs')
    .select('action')
    .order('action', { ascending: true });

  if (error || !data) return [];

  return [...new Set(data.map((r) => r.action as string))].sort();
}

export async function listAuditEntities(): Promise<string[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('admin_audit_logs')
    .select('entity')
    .order('entity', { ascending: true });

  if (error || !data) return [];

  return [...new Set(data.map((r) => r.entity as string))].sort();
}
