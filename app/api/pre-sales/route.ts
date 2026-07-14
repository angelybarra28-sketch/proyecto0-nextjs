import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { findOrCreateCustomer } from '@/lib/repositories/customerRepository';
import { createSale, createSaleItems } from '@/lib/repositories/saleRepository';
import type { SaleInsert, SaleItemInsert } from '@/lib/supabase/types';

interface PreSaleItem {
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  installmentCount?: number;
}

interface PreSaleInput {
  fullName: string;
  phone?: string;
  address?: string;
  location?: string;
  items: PreSaleItem[];
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ persisted: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const input = await request.json() as PreSaleInput;

    if (!input.fullName || !input.items || input.items.length === 0) {
      return NextResponse.json({ persisted: false, error: 'Missing required fields' }, { status: 400 });
    }

    const customer = await findOrCreateCustomer(supabase, {
      full_name: input.fullName,
      phone: input.phone || null,
      address: input.address || null,
      city: input.location || null,
    });

    const total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = input.items.reduce((sum, item) => sum + item.quantity, 0);
    const checkoutRequestId = crypto.randomUUID();

    const installmentCount = input.items[0]?.installmentCount ?? 8;

    const saleInput: SaleInsert = {
      checkout_request_id: checkoutRequestId,
      customer_id: customer.id,
      sale_status: 'PENDING',
      subtotal_amount: total,
      discount_amount: 0,
      total_amount: total,
      paid_amount: 0,
      remaining_amount: total,
      item_count: itemCount,
      payment_plan_type: 'INSTALLMENTS',
      installments_count: installmentCount,
      delivery_full_name: input.fullName,
      delivery_phone: input.phone || null,
      delivery_address: input.address || null,
      delivery_city: input.location || null,
    };

    const sale = await createSale(supabase, saleInput);

    const saleItems: SaleItemInsert[] = input.items.map((item) => ({
      sale_id: sale.id,
      product_name_snapshot: item.name,
      unit_price_snapshot: item.price,
      quantity: item.quantity,
      line_subtotal: item.price * item.quantity,
      line_discount_amount: 0,
      line_total: item.price * item.quantity,
      image_url_snapshot: item.imageUrl || null,
    }));

    await createSaleItems(supabase, saleItems);

    const installmentAmount = Math.round(total / installmentCount);
    const now = new Date();

    const installmentRows = Array.from({ length: installmentCount }, (_, i) => {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 30 * (i + 1));

      const isLast = i === installmentCount - 1;
      const amount = isLast ? total - installmentAmount * (installmentCount - 1) : installmentAmount;

      return {
        sale_id: sale.id,
        installment_number: i + 1,
        due_date: dueDate.toISOString().slice(0, 10),
        original_amount: amount,
        paid_amount: 0,
        remaining_amount: amount,
        status: 'PENDING' as const,
      };
    });

    const { error: installmentError } = await supabase
      .from('installments')
      .insert(installmentRows);

    if (installmentError) {
      console.error('[pre-sales] Error creating installments:', installmentError);
    }

    return NextResponse.json({
      persisted: true,
      saleId: sale.id,
      saleNumber: sale.sale_number,
    });
  } catch (error) {
    console.error('[pre-sales] Error creating pre-sale:', error);
    return NextResponse.json(
      { persisted: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
