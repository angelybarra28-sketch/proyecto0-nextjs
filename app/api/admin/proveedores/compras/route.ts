import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { listCompras, createCompra } from '@/lib/services/admin/proveedores';

export async function GET(request: Request) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const proveedorId = searchParams.get('proveedor_id') ?? undefined;
    const estado = searchParams.get('estado') ?? undefined;
    const dateFrom = searchParams.get('date_from') ?? undefined;
    const dateTo = searchParams.get('date_to') ?? undefined;
    const soloPendientes = searchParams.get('solo_pendientes') === 'true' || undefined;
    const soloPagadas = searchParams.get('solo_pagadas') === 'true' || undefined;

    const compras = await listCompras(proveedorId, estado, dateFrom, dateTo, soloPendientes, soloPagadas);
    return NextResponse.json({ compras }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.compras', action: 'list', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const body = await request.json();
    const compra = await createCompra(body);
    return NextResponse.json({ compra }, { status: 201, headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.compras', action: 'create', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
