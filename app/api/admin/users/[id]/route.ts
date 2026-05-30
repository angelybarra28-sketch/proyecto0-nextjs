import { NextResponse } from 'next/server';
import { getAdminUserContext, requireStrictAdminUser } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/services/admin/audit';
import { toggleUserStatus } from '@/lib/services/adminUserService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface ToggleUserBody {
  isActive: boolean;
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await context.params;
    const body = (await request.json()) as ToggleUserBody;

    if (typeof body.isActive !== 'boolean') {
      return errorResponse(new Error('Payload inválido'), requestContext.requestId, 400);
    }

    const adminUser = await getAdminUserContext((role) => role === 'ADMIN');

    if (!adminUser) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403, headers: { 'x-request-id': requestContext.requestId } });
    }

    const { previousIsActive, newIsActive } = await toggleUserStatus(adminUser, id, body.isActive);

    await logAdminAction({
      adminUserId: adminUser.userId,
      action: newIsActive ? 'user_activated' : 'user_deactivated',
      entity: 'user',
      entityId: id,
      metadata: {
        previousIsActive,
        newIsActive,
      },
    });

    return NextResponse.json(
      { success: true, previousIsActive, newIsActive },
      { headers: { 'x-request-id': requestContext.requestId } }
    );
  } catch (error) {
    const { id } = await context.params;
    const message = error instanceof Error ? error.message : '';

    if (message === 'SELF_DEACTIVATION') {
      return NextResponse.json({ message: 'No podés desactivarte a vos mismo' }, { status: 409, headers: { 'x-request-id': requestContext.requestId } });
    }

    if (message === 'LAST_ADMIN') {
      return NextResponse.json({ message: 'No se puede desactivar el último administrador' }, { status: 409, headers: { 'x-request-id': requestContext.requestId } });
    }

    if (message === 'USER_NOT_FOUND') {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404, headers: { 'x-request-id': requestContext.requestId } });
    }

    logServerError({ area: 'admin.users', action: 'toggle', entity: 'user', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 500);
  }
}
