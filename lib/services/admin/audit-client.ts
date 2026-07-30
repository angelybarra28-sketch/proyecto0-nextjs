import type { AuditLogResponse, AuditLogFilters } from './auditService';

export async function fetchAuditLogs(
  filters: AuditLogFilters,
  signal?: AbortSignal
): Promise<AuditLogResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.action) params.set('action', filters.action);
  if (filters.entity) params.set('entity', filters.entity);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);

  const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, { signal });
  if (!res.ok) throw new Error('Error al cargar logs de auditoría');
  return res.json();
}

export async function fetchAuditActions(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch('/api/admin/audit-logs?mode=actions', { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return data.actions ?? [];
}

export async function fetchAuditEntities(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch('/api/admin/audit-logs?mode=entities', { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return data.entities ?? [];
}
