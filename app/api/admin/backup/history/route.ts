import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { queryBackupHistory } from '@/lib/services/admin/backup/history.service';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const result = await queryBackupHistory();

    return NextResponse.json(result, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.backup', action: 'history', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
