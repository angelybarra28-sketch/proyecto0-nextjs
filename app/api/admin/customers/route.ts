import { NextRequest, NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return errorResponse(new Error('Supabase no está configurado'), context.requestId, 500);
    }

    const [customersResult, accountsResult] = await Promise.all([
      supabase
        .from('customers')
        .select('id, full_name, phone, email, dni, user_id')
        .order('full_name', { ascending: true }),
      supabase
        .from('credit_accounts')
        .select('customer_id, id, operation_number, product_name, sale_date, installment_amount, installment_count'),
    ]);

    if (customersResult.error) {
      logServerError({ area: 'admin.customers', action: 'list', requestId: context.requestId, error: customersResult.error });
      return errorResponse(customersResult.error, context.requestId, 500);
    }

    if (accountsResult.error) {
      logServerError({ area: 'admin.customers', action: 'list', requestId: context.requestId, error: accountsResult.error });
      return errorResponse(accountsResult.error, context.requestId, 500);
    }

    const opsByCustomer = new Map<string, string[]>();
    const accountsByCustomer = new Map<string, Array<Record<string, unknown>>>();
    for (const acc of accountsResult.data || []) {
      const ops = opsByCustomer.get(acc.customer_id) || [];
      if (acc.operation_number) ops.push(acc.operation_number);
      opsByCustomer.set(acc.customer_id, ops);

      const list = accountsByCustomer.get(acc.customer_id) || [];
      list.push({
        id: acc.id,
        operation_number: acc.operation_number,
        product_name: acc.product_name,
        sale_date: acc.sale_date,
        installment_amount: acc.installment_amount,
        installment_count: acc.installment_count,
      });
      accountsByCustomer.set(acc.customer_id, list);
    }

    const data = (customersResult.data || []).map((c) => ({
      id: c.id,
      full_name: c.full_name,
      phone: c.phone,
      email: c.email,
      dni: c.dni,
      user_id: c.user_id,
      operation_numbers: opsByCustomer.get(c.id) || [],
      credit_accounts: accountsByCustomer.get(c.id) || [],
    }));

    return NextResponse.json({ customers: data }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.customers', action: 'list', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}

export async function POST(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const body = (await request.json()) as {
      fullName?: string;
      phone?: string;
      address?: string;
    };

    if (!body.fullName || typeof body.fullName !== 'string') {
      return errorResponse(new Error('fullName es requerido'), context.requestId, 400);
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return errorResponse(new Error('Supabase no está configurado'), context.requestId, 500);
    }

    // Check for existing customer by phone
    if (body.phone && body.phone.trim()) {
      const { data: existingPhone } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', body.phone.trim())
        .maybeSingle();

      if (existingPhone?.id) {
        return NextResponse.json(
          { success: true, customerId: existingPhone.id, existing: true },
          { headers: { 'x-request-id': context.requestId } }
        );
      }
    }

    // Check for existing customer by name
    const { data: existingName } = await supabase
      .from('customers')
      .select('id')
      .eq('full_name', body.fullName.trim())
      .maybeSingle();

    if (existingName?.id) {
      return NextResponse.json(
        { success: true, customerId: existingName.id, existing: true },
        { headers: { 'x-request-id': context.requestId } }
      );
    }

    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        full_name: body.fullName.trim(),
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
      })
      .select('id')
      .single();

    if (error || !newCustomer) {
      logServerError({
        area: 'admin.customers',
        action: 'create',
        requestId: context.requestId,
        error: error ?? new Error('CUSTOMER_INSERT_NO_ROWS'),
      });
      return errorResponse(
        new Error(error?.message || 'No se pudo crear el cliente'),
        context.requestId,
        500
      );
    }

    return NextResponse.json(
      { success: true, customerId: newCustomer.id, existing: false },
      { headers: { 'x-request-id': context.requestId } }
    );
  } catch (error) {
    logServerError({ area: 'admin.customers', action: 'create', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
