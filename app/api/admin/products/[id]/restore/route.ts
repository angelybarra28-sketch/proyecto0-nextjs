import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { restoreAdminProduct } from '@/lib/services/admin/trash';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { measureAsync } from '@/lib/server/runtimeMetrics';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await context.params;
    const product = await measureAsync('admin.products', 'restore', () => restoreAdminProduct(id), requestContext.requestId);
    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'product_restored',
      entity: 'product',
      entityId: id,
      metadata: {
        productId: product.id,
        name: product.name,
        slug: product.slug,
      },
    });
    return NextResponse.json({ product }, { headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    const { id } = await context.params;
    logServerError({ area: 'admin.products', action: 'restore', entity: 'product', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 400);
  }
}
