import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { hardDeleteAdminProduct, ProductReferenceError } from '@/lib/services/admin/trash';
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
    const result = await measureAsync('admin.products', 'hard-delete', () => hardDeleteAdminProduct(id), requestContext.requestId);
    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'product_hard_deleted',
      entity: 'product',
      entityId: id,
      metadata: {
        productId: result.id,
        name: result.name,
        slug: result.slug,
      },
    });
    return NextResponse.json({ success: true }, { headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    const { id } = await context.params;
    if (error instanceof ProductReferenceError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PRODUCT_REFERENCED',
            message: error.message,
            requestId: requestContext.requestId,
          },
        },
        { status: 409, headers: { 'x-request-id': requestContext.requestId } }
      );
    }
    logServerError({ area: 'admin.products', action: 'hard-delete', entity: 'product', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 400);
  }
}
