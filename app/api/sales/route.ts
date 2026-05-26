import { NextResponse } from 'next/server';
import { persistCheckoutSale } from '@/lib/services/checkoutSaleService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { isMaintenanceModeActive, maintenanceModeResponse } from '@/lib/server/maintenance';
import { measureAsync } from '@/lib/server/runtimeMetrics';
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
  const context = createRequestContext(request);

  try {
    if (isMaintenanceModeActive()) {
      return maintenanceModeResponse(context.requestId);
    }

    const input = await request.json() as CheckoutSaleInput;

    if (!isValidCheckoutSaleInput(input)) {
      return errorResponse(new Error('Invalid checkout sale input'), context.requestId, 400);
    }

    const result = await measureAsync('sales', 'create', () => persistCheckoutSale(input), context.requestId);
    return NextResponse.json(result, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'sales', action: 'create', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
