import { NextResponse } from 'next/server';
import { getAdminUserContext } from '@/lib/auth/server';
import { getOptionalSupabaseClientEnv } from '@/env/client';
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

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestContext = createRequestContext(request);

  try {
    const env = getOptionalSupabaseClientEnv();
    if (!env) {
      return NextResponse.json({ message: 'Supabase Auth no está configurado' }, { status: 503, headers: { 'x-request-id': requestContext.requestId } });
    }

    const adminUser = await getAdminUserContext((role) => role === 'ADMIN');
    if (!adminUser) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403, headers: { 'x-request-id': requestContext.requestId } });
    }

    const { id } = await context.params;

    if (!isValidUUID(id)) {
      return errorResponse(new Error('ID de usuario inválido'), requestContext.requestId, 400);
    }

    const body = (await request.json()) as ToggleUserBody;

    if (typeof body.isActive !== 'boolean') {
      return errorResponse(new Error('Payload inválido'), requestContext.requestId, 400);
    }

    const { previousIsActive, newIsActive } = await toggleUserStatus(adminUser, id, body.isActive);

    try {
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
    } catch (auditError) {
      logServerError({
        area: 'admin.users',
        action: 'audit_log_failed',
        entity: 'user',
        entityId: id,
        requestId: requestContext.requestId,
        error: auditError,
      });
    }

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

    if (message === 'PROFILE_UPDATE_NO_ROWS') {
      return NextResponse.json({ message: 'No se pudo actualizar el perfil del usuario' }, { status: 500, headers: { 'x-request-id': requestContext.requestId } });
    }

    logServerError({ area: 'admin.users', action: 'toggle', entity: 'user', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 500);
  }
}
