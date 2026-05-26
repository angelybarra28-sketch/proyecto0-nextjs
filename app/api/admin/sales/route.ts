import { NextResponse } from 'next/server';
import { listAdminSalesPaginated } from '@/lib/services/adminSalesService';
import { requireAdminUser } from '@/lib/auth/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { measureAsync } from '@/lib/server/runtimeMetrics';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const searchParams = new URL(request.url).searchParams;
    const payload = await measureAsync('admin.sales', 'list', () => listAdminSalesPaginated({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search') ?? '',
      saleStatus: searchParams.get('saleStatus') ?? 'all',
      collectionStatus: searchParams.get('collectionStatus') ?? 'all',
      dateFrom: searchParams.get('dateFrom') ?? '',
      dateTo: searchParams.get('dateTo') ?? '',
      sortKey: searchParams.get('sortKey') ?? 'saleDate',
      direction: searchParams.get('direction') ?? 'desc',
    }), context.requestId);
    return NextResponse.json(payload, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.sales', action: 'list', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
