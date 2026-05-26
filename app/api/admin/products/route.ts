import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { getAdminCatalog } from '@/lib/services/adminCatalogService';
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
      sortKey: searchParams.get('sortKey') ?? 'createdAt',
      direction: searchParams.get('direction') ?? 'desc',
    }), context.requestId);
    return NextResponse.json(catalog, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.products', action: 'list', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
