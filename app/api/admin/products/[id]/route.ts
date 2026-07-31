import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { deleteAdminProduct, updateAdminProduct, type AdminProductPayload } from '@/lib/services/adminCatalogService';
import { logAdminAction } from '@/lib/services/admin/audit';
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
    const adminUser = await getAdminUserContext();
    const product = await measureAsync(
      'admin.products',
      'update',
      () => updateAdminProduct(id, payload, adminUser?.userId ?? null),
      requestContext.requestId
    );
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'product_updated',
      entity: 'product',
      entityId: id,
      metadata: { updatedFields: Object.keys(payload).filter((key) => key !== 'priceChangeReason') },
    });
    return NextResponse.json({ product }, { headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    const { id } = await context.params;
    logServerError({ area: 'admin.products', action: 'update', entity: 'product', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 400);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    const adminUser = await getAdminUserContext();
    const product = await measureAsync(
      'admin.products',
      'trash',
      () => deleteAdminProduct(id, adminUser?.userId ?? null, reason || null),
      requestContext.requestId
    );
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'product_trashed',
      entity: 'product',
      entityId: id,
      metadata: {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        reason: reason || null,
      },
    });
    return NextResponse.json({ success: true }, { headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    const { id } = await context.params;
    logServerError({ area: 'admin.products', action: 'trash', entity: 'product', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 400);
  }
}
