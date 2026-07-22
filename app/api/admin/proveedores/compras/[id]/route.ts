import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { getCompra, updateCompra } from '@/lib/services/admin/proveedores';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const { id } = await params;
    const result = await getCompra(id);
    if (!result) return errorResponse(new Error('Compra no encontrada'), context.requestId, 404);

    return NextResponse.json(result, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.compras', action: 'get', entityId: (await params).id, requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const compra = await updateCompra(id, body);
    return NextResponse.json({ compra }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.compras', action: 'update', entityId: (await params).id, requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
