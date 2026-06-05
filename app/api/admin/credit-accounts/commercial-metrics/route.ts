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

    const { data, error } = await supabase.rpc('get_credit_commercial_metrics');

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;

    return NextResponse.json(
      {
        currentMonthlyCollection: Number(row?.current_monthly_collection ?? 0),
        monthlyReplacement: Number(row?.monthly_replacement ?? 0),
        finishedCards: Number(row?.finished_cards ?? 0),
        finishedInstallmentsAmount: Number(row?.finished_installments_amount ?? 0),
        projectedNextMonth: Number(row?.projected_next_month ?? 0),
      },
      { headers: { 'x-request-id': context.requestId } }
    );
  } catch (error) {
    logServerError({ area: 'admin.creditAccounts', action: 'commercialMetrics', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
