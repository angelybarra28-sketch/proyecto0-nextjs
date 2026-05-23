import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { getAdminCatalog } from '@/lib/services/adminCatalogService';

export async function GET() {
  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const catalog = await getAdminCatalog();
    return NextResponse.json(catalog);
  } catch (error) {
    console.error('Error loading admin products:', error);
    return NextResponse.json({ message: 'No se pudieron cargar los productos' }, { status: 500 });
  }
}
