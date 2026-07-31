import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { listProductPriceHistory } from '@/lib/services/admin/product-price-history';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { measureAsync } from '@/lib/server/runtimeMetrics';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await context.params;
    const payload = await measureAsync(
      'admin.products',
      'price-history',
      () => listProductPriceHistory(id),
      requestContext.requestId
    );

    return NextResponse.json(payload, { headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    const { id } = await context.params;
    logServerError({ area: 'admin.products', action: 'price-history', entity: 'product', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 400);
  }
}
