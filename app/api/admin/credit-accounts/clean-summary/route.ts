import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return errorResponse(new Error('Supabase no está configurado'), context.requestId, 503);
    }

    const { data, error } = await supabase.rpc('get_credit_clean_summary');

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;

    return NextResponse.json(
      {
        allocationCount: Number(row?.allocation_count ?? 0),
        paymentCount: Number(row?.payment_count ?? 0),
        installmentCount: Number(row?.installment_count ?? 0),
        accountCount: Number(row?.account_count ?? 0),
        customerCount: Number(row?.customer_count ?? 0),
      },
      { headers: { 'x-request-id': context.requestId } }
    );
  } catch (error) {
    logServerError({ area: 'admin.creditAccounts', action: 'cleanSummary', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
