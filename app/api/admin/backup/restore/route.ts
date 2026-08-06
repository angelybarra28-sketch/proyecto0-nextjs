import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { restoreBackup, RestoreError, type RestoreMode } from '@/lib/services/admin/backup';
import {
  buildPayloadTooLargeMessage,
  getMaxRestorePayloadBytes,
  getMaxRestorePayloadMb,
} from '@/lib/services/admin/backup/restoreConfig';
import { computeChecksum } from '@/lib/services/admin/backup/checksum';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { measureAsync } from '@/lib/server/runtimeMetrics';

export async function POST(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const modeHeader = request.headers.get('X-Restore-Mode') ?? '';
    const mode: RestoreMode = modeHeader === 'replace' ? 'replace' : 'merge';

    const maxMb = getMaxRestorePayloadMb();
    const maxBytes = getMaxRestorePayloadBytes(maxMb);

    const contentLength = request.headers.get('Content-Length');
    if (contentLength) {
      const declaredBytes = Number(contentLength);
      if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
        return errorResponse(new RestoreError(buildPayloadTooLargeMessage(maxMb), 413), context.requestId, 413);
      }
    }

    const rawJson = await request.text();

    if (!rawJson || rawJson.trim().length === 0) {
      return errorResponse(new RestoreError('El cuerpo de la solicitud está vacío'), context.requestId, 400);
    }

    const checksum = computeChecksum(rawJson);

    const adminUser = await getAdminUserContext();

    const startedAt = Date.now();

    let parsedVersion = '';
    try {
      const parsed = JSON.parse(rawJson) as { manifest?: { version?: string } };
      parsedVersion = parsed?.manifest?.version ?? '';
    } catch {
      parsedVersion = '';
    }

    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'backup_restore_started',
      entity: 'backup',
      entityId: null,
      metadata: {
        mode,
        version: parsedVersion,
        checksum,
      },
    });

    const result = await measureAsync(
      'admin.backup',
      'restore',
      () => restoreBackup({ mode, rawJson, checksum }),
      context.requestId
    );

    result.durationMs = Date.now() - startedAt;

    if (result.success) {
      await logAdminAction({
        adminUserId: adminUser?.userId ?? null,
        action: 'backup_restored',
        entity: 'backup',
        entityId: null,
        metadata: {
          mode: result.mode,
          version: result.version,
          checksum: result.checksum,
          tables: result.tables.length,
          rows: result.totalInserted + result.totalUpdated,
          durationMs: result.durationMs,
          inserted: result.totalInserted,
          updated: result.totalUpdated,
          ignored: result.totalIgnored,
          warnings: result.warnings.length,
        },
      });
    } else {
      await logAdminAction({
        adminUserId: adminUser?.userId ?? null,
        action: 'backup_restore_failed',
        entity: 'backup',
        entityId: null,
        metadata: {
          mode: result.mode,
          version: result.version,
          checksum: result.checksum,
          tables: result.tables.length,
          rows: result.totalInserted + result.totalUpdated,
          durationMs: result.durationMs,
          errors: result.errors.length,
          rollbackApplied: result.rollbackApplied,
        },
      });
    }

    return NextResponse.json(result, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.backup', action: 'restore', requestId: context.requestId, error });
    return errorResponse(
      error,
      context.requestId,
      error instanceof RestoreError ? error.status : 500,
      error instanceof RestoreError ? error.message : undefined
    );
  }
}
