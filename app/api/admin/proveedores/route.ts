import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { listProveedores, createProveedor } from '@/lib/services/admin/proveedores';

export async function GET(request: Request) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') ?? undefined;
    const search = searchParams.get('search') ?? undefined;

    const proveedores = await listProveedores(estado, search);
    return NextResponse.json({ proveedores }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.proveedores', action: 'list', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const body = await request.json();
    const proveedor = await createProveedor(body);
    return NextResponse.json({ proveedor }, { status: 201, headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.proveedores', action: 'create', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
