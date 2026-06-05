import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function POST(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return errorResponse(new Error('Supabase no está configurado'), context.requestId, 503);
    }

    const { data, error } = await supabase.rpc('clean_credit_portfolio');

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return NextResponse.json(
      {
        allocationsDeleted: Number(row?.allocations_deleted ?? 0),
        paymentsDeleted: Number(row?.payments_deleted ?? 0),
        installmentsDeleted: Number(row?.installments_deleted ?? 0),
        accountsDeleted: Number(row?.accounts_deleted ?? 0),
        customersDeleted: Number(row?.customers_deleted ?? 0),
        timestamp,
      },
      { headers: { 'x-request-id': context.requestId } }
    );
  } catch (error) {
    logServerError({ area: 'admin.creditAccounts', action: 'clean', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
