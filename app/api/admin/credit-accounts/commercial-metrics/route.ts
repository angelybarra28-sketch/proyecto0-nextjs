import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { getCreditAccounts } from '@/lib/repositories/creditAccountRepository';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

function parseDateParts(dateStr: string | null): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

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

    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();

    const { count: replacementCount, error: countError } = await supabase
      .from('credit_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('origin_month', currentMonth)
      .eq('origin_year', currentYear);

    if (countError) {
      console.error('Error counting replacements:', countError);
    }

    // Fetch all accounts (including inactive/finished) to build the finished list
    const { accounts, installments, payments } = await getCreditAccounts(supabase, true);
    console.log(`[commercial-metrics] Total accounts fetched: ${accounts.length}`);
    console.log(`[commercial-metrics] Total installments fetched: ${installments.length}`);
    console.log(`[commercial-metrics] Total payments fetched: ${payments.length}`);

    const installmentsByAccount = new Map<string, { original_amount: number; paid_amount: number; remaining_amount: number; status: string }[]>();
    for (const inst of installments) {
      const list = installmentsByAccount.get(inst.credit_account_id) ?? [];
      list.push(inst);
      installmentsByAccount.set(inst.credit_account_id, list);
    }

    const paymentsByAccount = new Map<string, { payment_date: string }[]>();
    for (const payment of payments) {
      const list = paymentsByAccount.get(payment.credit_account_id) ?? [];
      list.push({ payment_date: payment.payment_date });
      paymentsByAccount.set(payment.credit_account_id, list);
    }

    const finishedAccountsList = accounts
      .map((account) => {
        const insts = installmentsByAccount.get(account.id) ?? [];
        const pays = paymentsByAccount.get(account.id) ?? [];
        const total = insts.reduce((sum, i) => sum + Number(i.original_amount), 0);
        const paid = insts.reduce((sum, i) => sum + Number(i.paid_amount), 0);
        const remaining = insts.reduce((sum, i) => sum + Number(i.remaining_amount), 0);
        const lastPaymentDate = pays.length > 0
          ? pays.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0].payment_date
          : null;
        return {
          id: account.id,
          customerId: account.customer_id,
          operationNumber: account.operation_number,
          productName: account.product_name,
          quantity: account.quantity,
          installmentCount: account.installment_count,
          installmentAmount: Number(account.installment_amount),
          saleDate: account.sale_date,
          notes: account.notes ?? '',
          isActive: account.is_active,
          createdAt: account.created_at,
          updatedAt: account.updated_at,
          originMonth: account.origin_month ?? null,
          originYear: account.origin_year ?? null,
          total,
          paid,
          remaining: Math.max(0, remaining),
          paymentCount: insts.filter((i) => i.status === 'PAID' || i.status === 'PARTIAL').length,
          lastPaymentDate,
        };
      })
      .filter((acc) => {
        // Exact logic from get_credit_commercial_metrics:
        // total_remaining = 0 AND last_payment_date in current month
        if (acc.remaining > 0.01) {
          console.log(`[commercial-metrics] Account ${acc.id} excluded: remaining=${acc.remaining}`);
          return false;
        }
        if (!acc.lastPaymentDate) {
          console.log(`[commercial-metrics] Account ${acc.id} excluded: no lastPaymentDate`);
          return false;
        }
        const parts = parseDateParts(acc.lastPaymentDate);
        if (!parts) {
          console.log(`[commercial-metrics] Account ${acc.id} excluded: invalid date ${acc.lastPaymentDate}`);
          return false;
        }
        const isCurrentMonth = parts.year === currentYear && parts.month === currentMonth;
        console.log(`[commercial-metrics] Account ${acc.id}: lastPaymentDate=${acc.lastPaymentDate}, parts=${JSON.stringify(parts)}, isCurrentMonth=${isCurrentMonth}`);
        return isCurrentMonth;
      });

    console.log(`[commercial-metrics] Finished accounts found: ${finishedAccountsList.length}`);

    // Load customer names for finished accounts
    const customerIds = [...new Set(finishedAccountsList.map((a) => a.customerId))];
    const { data: customers } = await supabase
      .from('customers')
      .select('id, full_name')
      .in('id', customerIds);

    const customerMap = new Map(
      (customers ?? []).map((c: { id: string; full_name: string }) => [c.id, c.full_name])
    );

    const finishedAccountsListWithNames = finishedAccountsList.map((acc) => ({
      ...acc,
      customerName: customerMap.get(acc.customerId) ?? 'Cliente desconocido',
    }));

    console.log(`[commercial-metrics] Returning ${finishedAccountsListWithNames.length} finished accounts`);

    return NextResponse.json(
      {
        currentMonthlyCollection: Number(row?.current_monthly_collection ?? 0),
        monthlyReplacement: Number(row?.monthly_replacement ?? 0),
        replacementCount: Number(replacementCount ?? 0),
        finishedCards: Number(row?.finished_cards ?? 0),
        finishedInstallmentsAmount: Number(row?.finished_installments_amount ?? 0),
        projectedNextMonth: Number(row?.projected_next_month ?? 0),
        finishedAccountsList: finishedAccountsListWithNames,
      },
      { headers: { 'x-request-id': context.requestId } }
    );
  } catch (error) {
    logServerError({ area: 'admin.creditAccounts', action: 'commercialMetrics', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
