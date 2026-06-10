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
