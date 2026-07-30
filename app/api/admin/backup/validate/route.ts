import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { validateBackup } from '@/lib/services/admin/backup';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { measureAsync } from '@/lib/server/runtimeMetrics';

export async function POST(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const rawJson = await request.text();

    if (!rawJson || rawJson.trim().length === 0) {
      return NextResponse.json(
        { valid: false, errors: ['El cuerpo de la solicitud está vacío'], warnings: [], summary: { tables: 0, rows: 0, checksum: '', version: '', exportedAt: '' } },
        { status: 400 },
      );
    }

    const result = await measureAsync('admin.backup', 'validate', () => Promise.resolve(validateBackup(rawJson)), context.requestId);

    const adminUser = await getAdminUserContext();

    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'backup_validated',
      entity: 'backup',
      entityId: null,
      metadata: {
        valid: result.valid,
        tables: result.summary.tables,
        rows: result.summary.rows,
        warnings: result.warnings.length,
        errors: result.errors.length,
      },
    });

    return NextResponse.json(result, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.backup', action: 'validate', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
