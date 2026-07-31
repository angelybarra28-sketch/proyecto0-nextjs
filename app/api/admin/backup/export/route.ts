import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { exportBackup } from '@/lib/services/admin/backup';
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

    const startedAt = Date.now();
    const payload = await measureAsync('admin.backup', 'export', () => exportBackup(), context.requestId);
    const durationMs = Date.now() - startedAt;

    const adminUser = await getAdminUserContext();

    const totalRows = Object.values(payload.manifest.rowCounts).reduce((sum, count) => sum + count, 0);
    const jsonString = JSON.stringify(payload);
    const fileSizeBytes = new TextEncoder().encode(jsonString).length;
    const checksum = computeChecksum(jsonString);

    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'backup_exported',
      entity: 'backup',
      entityId: null,
      metadata: {
        version: payload.manifest.version,
        checksum,
        durationMs,
        exportedTables: payload.manifest.tables,
        totalRows,
        fileSizeBytes,
      },
    });

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=${filename}`,
        'Content-Length': String(fileSizeBytes),
      },
    });
  } catch (error) {
    logServerError({ area: 'admin.backup', action: 'export', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
