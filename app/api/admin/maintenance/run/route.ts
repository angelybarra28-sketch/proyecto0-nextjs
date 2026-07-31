import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import {
  runMaintenanceAction,
  type MaintenanceAction,
} from '@/lib/services/admin/maintenance';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

const VALID_ACTIONS: MaintenanceAction[] = [
  'financial_refresh',
  'credit_overdue_refresh',
  'storage_check',
  'cache_clear',
  'diagnostics',
];

const AUDIT_ACTION_BY_TOOL: Record<MaintenanceAction, string> = {
  financial_refresh: 'maintenance_financial_refresh',
  credit_overdue_refresh: 'maintenance_credit_overdue_refresh',
  storage_check: 'maintenance_storage_check',
  cache_clear: 'maintenance_cache_clear',
  diagnostics: 'maintenance_run',
};

export async function POST(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const body = await request.json().catch(() => null) as { action?: string } | null;
    const action = body?.action as MaintenanceAction;

    if (!body || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, message: `Acción inválida. Válidas: ${VALID_ACTIONS.join(', ')}` },
        { status: 400, headers: { 'x-request-id': context.requestId } },
      );
    }

    const adminUser = await getAdminUserContext();
    const result = await runMaintenanceAction(action);

    const metadata: Record<string, unknown> = { tool: action };

    if (action === 'storage_check') {
      const storage = result.result as { buckets: unknown[]; totalObjects: number; totalReferenced: number; status: string } | undefined;
      metadata.buckets = storage?.buckets?.length ?? 0;
      metadata.totalObjects = storage?.totalObjects ?? 0;
      metadata.totalReferenced = storage?.totalReferenced ?? 0;
      metadata.status = storage?.status ?? 'ok';
    }

    if (action === 'diagnostics') {
      const diagnostics = (result.result as { diagnostics: Array<{ count: number; status: string }> } | undefined)?.diagnostics ?? [];
      metadata.checks = diagnostics.length;
      metadata.warnings = diagnostics.filter((d) => d.status === 'warning').length;
      metadata.errors = diagnostics.filter((d) => d.status === 'error').length;
    }

    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: AUDIT_ACTION_BY_TOOL[action],
      entity: 'maintenance',
      entityId: null,
      metadata,
    });

    return NextResponse.json(result, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.maintenance', action: 'run', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
