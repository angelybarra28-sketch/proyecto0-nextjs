import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getOptionalSupabaseClientEnv } from '@/env/client';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  try {
    const env = getOptionalSupabaseClientEnv();
    if (!env) {
      return errorResponse(new Error('Supabase Auth no está configurado'), context.requestId, 503);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, phone, email, user_id')
      .eq('user_id', user.id);

    if (customerError) {
      logServerError({ area: 'mi-cuenta', action: 'resumen', requestId: context.requestId, error: customerError });
      return errorResponse(customerError, context.requestId, 500);
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        customer: null,
        resumen: null,
        message: 'Tu cuenta aún no está vinculada a un cliente. Contactanos.',
      });
    }

    const customerIds = customers.map((c) => c.id);
    const mainCustomer = customers[0];

    const { data: accounts, error: accountsError } = await supabase
      .from('credit_accounts')
      .select(`
        id, operation_number, product_name, quantity, installment_count,
        installment_amount, sale_date, notes, is_active,
        credit_installments(id, installment_number, due_date, original_amount, paid_amount, remaining_amount, status),
        credit_account_items(id, product_name, quantity, unit_price),
        credit_payments(id, amount, payment_method, payment_date)
      `)
      .in('customer_id', customerIds)
      .order('sale_date', { ascending: false });

    if (accountsError) {
      logServerError({ area: 'mi-cuenta', action: 'resumen', requestId: context.requestId, error: accountsError });
      return errorResponse(accountsError, context.requestId, 500);
    }

    let totalDeuda = 0;
    let cuotasAtrasadas = 0;
    let montoAtrasado = 0;
    let cuotasPagadas = 0;
    let montoPagado = 0;
    let totalCuotas = 0;

    for (const account of accounts || []) {
      for (const inst of account.credit_installments || []) {
        totalCuotas++;
        if (inst.status === 'PAID') {
          cuotasPagadas++;
          montoPagado += Number(inst.paid_amount);
        } else if (inst.status === 'OVERDUE') {
          cuotasAtrasadas++;
          montoAtrasado += Number(inst.remaining_amount);
        } else if (inst.status === 'PENDING' || inst.status === 'PARTIAL') {
          totalDeuda += Number(inst.remaining_amount);
        }
      }
    }

    return NextResponse.json({
      customer: {
        id: mainCustomer.id,
        nombre: mainCustomer.full_name,
        telefono: mainCustomer.phone,
        email: mainCustomer.email,
      },
      resumen: {
        saldoDeudor: totalDeuda + montoAtrasado,
        cuotasAtrasadas: { cantidad: cuotasAtrasadas, monto: montoAtrasado },
        cuotasPagadas: { cantidad: cuotasPagadas, monto: montoPagado },
        totalCuotas,
      },
      cuentas: (accounts || []).map((a: Record<string, unknown>) => ({
        id: a.id,
        operationNumber: a.operation_number,
        producto: a.product_name,
        cantidad: a.quantity,
        cuotas: a.installment_count,
        montoCuota: a.installment_amount,
        fecha: a.sale_date,
        activa: a.is_active,
        items: a.credit_account_items || [],
        cuotasDetalle: a.credit_installments || [],
        pagos: a.credit_payments || [],
      })),
    });
  } catch (error) {
    logServerError({ area: 'mi-cuenta', action: 'resumen', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
