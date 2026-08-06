import { NextResponse } from 'next/server';
import { getAdminSaleDetail, updateAdminSale, replaceAdminSaleItems } from '@/lib/services/adminSalesService';
import { createCreditAccountFromSale } from '@/lib/services/saleToCreditService';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/services/admin/audit';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import type { SaleStatus, SaleItemInsert } from '@/lib/supabase/types';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: Props) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await params;
    const sale = await getAdminSaleDetail(id);

    if (!sale) {
      return NextResponse.json({ sale: null }, { status: 404, headers: { 'x-request-id': requestContext.requestId } });
    }

    return NextResponse.json({ sale }, { headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.sales', action: 'get-detail', entity: 'sale', entityId: (await params).id, requestId: requestContext.requestId, error });
    return NextResponse.json({ sale: null }, { status: 500, headers: { 'x-request-id': requestContext.requestId } });
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await params;
    const body = await request.json() as {
      sale_number?: string;
      delivery_full_name?: string;
      delivery_phone?: string;
      delivery_address?: string;
      delivery_city?: string;
      notes?: string;
      sale_status?: SaleStatus;
      subtotal_amount?: number;
      discount_amount?: number;
      total_amount?: number;
      remaining_amount?: number;
      installments_count?: number;
      item_count?: number;
      items?: SaleItemInsert[];
    };

    const fields: Record<string, unknown> = {};

    if (body.sale_number !== undefined) fields.sale_number = body.sale_number;

    if (body.delivery_full_name !== undefined) fields.delivery_full_name = body.delivery_full_name;
    if (body.delivery_phone !== undefined) fields.delivery_phone = body.delivery_phone;
    if (body.delivery_address !== undefined) fields.delivery_address = body.delivery_address;
    if (body.delivery_city !== undefined) fields.delivery_city = body.delivery_city;
    if (body.notes !== undefined) fields.notes = body.notes;
    if (body.sale_status !== undefined) fields.sale_status = body.sale_status;
    if (body.subtotal_amount !== undefined) fields.subtotal_amount = body.subtotal_amount;
    if (body.discount_amount !== undefined) fields.discount_amount = body.discount_amount;
    if (body.total_amount !== undefined) fields.total_amount = body.total_amount;
    if (body.remaining_amount !== undefined) fields.remaining_amount = body.remaining_amount;
    if (body.installments_count !== undefined) fields.installments_count = body.installments_count;
    if (body.item_count !== undefined) fields.item_count = body.item_count;

    if (Object.keys(fields).length > 0) {
      await updateAdminSale(id, fields);
    }

    if (body.items !== undefined) {
      await replaceAdminSaleItems(id, body.items);
    }

    let creditAccountId: string | null = null;
    if (body.sale_status === 'CONFIRMED') {
      try {
        creditAccountId = await createCreditAccountFromSale(id);
      } catch (creditError) {
        logServerError({ area: 'admin.sales', action: 'create-credit-account', entity: 'sale', entityId: id, requestId: requestContext.requestId, error: creditError });
      }
    }

    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'sale_updated',
      entity: 'sale',
      entityId: id,
      metadata: {
        updatedFields: Object.keys(fields),
        itemsReplaced: body.items !== undefined,
        saleStatus: body.sale_status,
        creditAccountCreated: creditAccountId !== null,
      },
    });

    return NextResponse.json({ success: true, creditAccountId }, { headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    const { id } = await params;
    logServerError({ area: 'admin.sales', action: 'update', entity: 'sale', entityId: id, requestId: requestContext.requestId, error });
    return NextResponse.json({ error: 'No se pudo actualizar la venta' }, { status: 500, headers: { 'x-request-id': requestContext.requestId } });
  }
}
