import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { getAdminCatalog, createAdminProduct } from '@/lib/services/adminCatalogService';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { measureAsync } from '@/lib/server/runtimeMetrics';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const searchParams = new URL(request.url).searchParams;
    const catalog = await measureAsync('admin.products', 'list', () => getAdminCatalog({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search') ?? '',
      status: searchParams.get('status') ?? 'all',
      featured: searchParams.get('featured') ?? 'all',
      categoryId: searchParams.get('categoryId') ?? '',
      size: searchParams.get('size') ?? '',
      sortKey: searchParams.get('sortKey') ?? 'createdAt',
      direction: searchParams.get('direction') ?? 'desc',
    }), context.requestId);
    return NextResponse.json(catalog, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.products', action: 'list', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}

export async function POST(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const body = await request.json();
    const product = await measureAsync('admin.products', 'create', () => createAdminProduct(body), context.requestId);
    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'product_created',
      entity: 'product',
      entityId: product.id,
      metadata: { name: product.name, slug: product.slug },
    });
    return NextResponse.json({ product }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.products', action: 'create', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
