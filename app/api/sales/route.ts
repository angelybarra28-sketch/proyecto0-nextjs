import { NextResponse } from 'next/server';
import { persistCheckoutSale } from '@/lib/services/checkoutSaleService';
import type { CheckoutSaleInput } from '@/lib/supabase/types';

function isValidCheckoutSaleInput(input: CheckoutSaleInput): boolean {
  return Boolean(
    input.customer?.fullName &&
    input.customer?.address &&
    input.customer?.city &&
    input.checkoutRequestId &&
    Array.isArray(input.items) &&
    input.items.length > 0
  );
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as CheckoutSaleInput;

    if (!isValidCheckoutSaleInput(input)) {
      return NextResponse.json({ persisted: false }, { status: 400 });
    }

    const result = await persistCheckoutSale(input);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ persisted: false }, { status: 500 });
  }
}
