import { NextResponse } from 'next/server';
import { getAdminSaleDetail, updateAdminSale, replaceAdminSaleItems } from '@/lib/services/adminSalesService';
import { requireAdminUser } from '@/lib/auth/server';
import type { SaleStatus, SaleItemInsert } from '@/lib/supabase/types';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, { params }: Props) {
  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await params;
    const sale = await getAdminSaleDetail(id);

    if (!sale) {
      return NextResponse.json({ sale: null }, { status: 404 });
    }

    return NextResponse.json({ sale });
  } catch (error) {
    console.error('Error loading admin sale detail:', error);
    return NextResponse.json({ sale: null }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Props) {
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la venta' }, { status: 500 });
  }
}
