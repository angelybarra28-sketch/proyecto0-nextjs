import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { getNotifications } from '@/lib/services/admin/notifications';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const result = await getNotifications();

    return NextResponse.json(result, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.notifications', action: 'load', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}

export async function POST(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const adminUser = await getAdminUserContext();

    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'notifications_viewed',
      entity: 'notifications',
      entityId: null,
      metadata: { openedAt: new Date().toISOString() },
    });

    return NextResponse.json({ ok: true }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.notifications', action: 'viewed', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
