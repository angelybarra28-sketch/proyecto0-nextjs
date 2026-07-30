import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { createCompraItems } from '@/lib/services/admin/proveedores';

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const body = await request.json();
    const items = await createCompraItems(body.items);
    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'proveedor_compra_items_created',
      entity: 'proveedorCompraItems',
      entityId: null,
      metadata: { compraId: body.items?.[0]?.compra_id, itemCount: body.items?.length },
    });
    return NextResponse.json({ items }, { status: 201, headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.compras.items', action: 'create', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
