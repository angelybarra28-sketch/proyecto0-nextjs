import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/services/admin/audit';
import { updateAdminProduct, type AdminProductPayload } from '@/lib/services/adminCatalogService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { measureAsync } from '@/lib/server/runtimeMetrics';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await context.params;
    const payload = await request.json() as Partial<AdminProductPayload>;
    const product = await measureAsync('admin.products', 'update', () => updateAdminProduct(id, payload), requestContext.requestId);
    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: payload.status !== undefined && Object.keys(payload).length === 1 ? 'product_status_updated' : 'product_updated',
      entity: 'product',
      entityId: id,
      metadata: {
        fields: Object.keys(payload),
        status: payload.status,
      },
    });

    return NextResponse.json({ product }, { headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    const { id } = await context.params;
    logServerError({ area: 'admin.products', action: 'update', entity: 'product', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 400);
  }
}
