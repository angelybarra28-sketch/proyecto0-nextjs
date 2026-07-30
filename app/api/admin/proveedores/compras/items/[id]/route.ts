import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { deleteCompraItem } from '@/lib/services/admin/proveedores';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const { id } = await params;
    await deleteCompraItem(id);
    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'proveedor_compra_item_deleted',
      entity: 'proveedorCompraItem',
      entityId: id,
    });
    return NextResponse.json({ success: true }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.compras.items', action: 'delete', entityId: (await params).id, requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
