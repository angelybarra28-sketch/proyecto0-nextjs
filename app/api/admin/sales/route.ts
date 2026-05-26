import { NextResponse } from 'next/server';
import { listAdminSalesPaginated } from '@/lib/services/adminSalesService';
import { requireAdminUser } from '@/lib/auth/server';

export async function GET(request: Request) {
  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const searchParams = new URL(request.url).searchParams;
    const payload = await listAdminSalesPaginated({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search') ?? '',
      saleStatus: searchParams.get('saleStatus') ?? 'all',
      collectionStatus: searchParams.get('collectionStatus') ?? 'all',
      dateFrom: searchParams.get('dateFrom') ?? '',
      dateTo: searchParams.get('dateTo') ?? '',
      sortKey: searchParams.get('sortKey') ?? 'saleDate',
      direction: searchParams.get('direction') ?? 'desc',
    });
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error loading admin sales:', error);
    return NextResponse.json({ success: false, data: [], sales: [], error: 'No se pudieron cargar las ventas' }, { status: 500 });
  }
}
