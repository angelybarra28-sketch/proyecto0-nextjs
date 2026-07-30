import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/services/admin/audit';
import { classifyError, errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { listPagos, createPago } from '@/lib/services/admin/proveedores';

export async function GET(request: Request) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const proveedorId = searchParams.get('proveedor_id') ?? undefined;

    const pagos = await listPagos(proveedorId);
    return NextResponse.json({ pagos }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.pagos', action: 'list', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const body = await request.json();
    const pago = await createPago(body);
    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'proveedor_pago_created',
      entity: 'proveedorPago',
      entityId: pago.id,
      metadata: { proveedorId: body.proveedor_id, monto: body.monto },
    });
    return NextResponse.json({ pago }, { status: 201, headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.pagos', action: 'create', requestId: context.requestId, error });
    const code = classifyError(error);
    const status = code === 'VALIDATION_ERROR' ? 400 : 500;
    return errorResponse(error, context.requestId, status);
  }
}
