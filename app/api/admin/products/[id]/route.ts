import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { updateAdminProduct, type AdminProductPayload } from '@/lib/services/adminCatalogService';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await context.params;
    const payload = await request.json() as Partial<AdminProductPayload>;
    const product = await updateAdminProduct(id, payload);

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error updating admin product:', error);
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el producto';
    return NextResponse.json({ message }, { status: 400 });
  }
}
