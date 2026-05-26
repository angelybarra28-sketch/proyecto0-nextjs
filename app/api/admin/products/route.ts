import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { getAdminCatalog } from '@/lib/services/adminCatalogService';

export async function GET(request: Request) {
  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const searchParams = new URL(request.url).searchParams;
    const catalog = await getAdminCatalog({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search') ?? '',
      status: searchParams.get('status') ?? 'all',
      featured: searchParams.get('featured') ?? 'all',
      categoryId: searchParams.get('categoryId') ?? '',
      sortKey: searchParams.get('sortKey') ?? 'createdAt',
      direction: searchParams.get('direction') ?? 'desc',
    });
    return NextResponse.json(catalog);
  } catch (error) {
    console.error('Error loading admin products:', error);
    return NextResponse.json({ message: 'No se pudieron cargar los productos' }, { status: 500 });
  }
}
