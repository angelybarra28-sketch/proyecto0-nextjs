import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { getProveedor, updateProveedor } from '@/lib/services/admin/proveedores';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const { id } = await params;
    const proveedor = await getProveedor(id);
    if (!proveedor) return errorResponse(new Error('Proveedor no encontrado'), context.requestId, 404);

    return NextResponse.json({ proveedor }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.proveedores', action: 'get', entityId: (await params).id, requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const proveedor = await updateProveedor(id, body);
    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'proveedor_updated',
      entity: 'proveedor',
      entityId: id,
      metadata: { updatedFields: Object.keys(body) },
    });
    return NextResponse.json({ proveedor }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.proveedores', action: 'update', entityId: (await params).id, requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
