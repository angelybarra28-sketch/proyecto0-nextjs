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

    const { data: rows, error: rowsError } = await supabase.rpc('get_credit_monthly_control');

    if (rowsError) {
      throw rowsError;
    }

    const { data: metrics, error: metricsError } = await supabase.rpc('get_credit_commercial_metrics');

    if (metricsError) {
      throw metricsError;
    }

    const metricsRow = Array.isArray(metrics) ? metrics[0] : metrics;

    return NextResponse.json(
      {
        rows: (rows ?? []).map((r: Record<string, unknown>) => ({
          customerName: String(r.customer_name ?? ''),
          operationNumber: String(r.operation_number ?? ''),
          productName: String(r.product_name ?? ''),
          installmentAmount: Number(r.installment_amount ?? 0),
          status: String(r.status ?? ''),
          saleDate: String(r.sale_date ?? ''),
          lastPaymentDate: r.last_payment_date ? String(r.last_payment_date) : null,
          remainingAmount: Number(r.remaining_amount ?? 0),
        })),
        summary: {
          monthlyReplacement: Number(metricsRow?.monthly_replacement ?? 0),
          finishedCards: Number(metricsRow?.finished_cards ?? 0),
          totalCollected: Number(metricsRow?.current_monthly_collection ?? 0),
          projectedNextMonth: Number(metricsRow?.projected_next_month ?? 0),
        },
      },
      { headers: { 'x-request-id': context.requestId } }
    );
  } catch (error) {
    logServerError({ area: 'admin.creditAccounts', action: 'controlMensual', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
