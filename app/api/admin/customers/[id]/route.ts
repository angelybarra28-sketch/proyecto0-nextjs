import { NextRequest, NextResponse } from 'next/server';
import { getAdminUserContext, requireStrictAdminUser } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/services/admin/audit';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = createRequestContext(request);
  const { id } = await params;

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const body = (await request.json()) as { userId: string | null };

    if (body.userId !== null && typeof body.userId !== 'string') {
      return errorResponse(new Error('userId debe ser un string o null'), context.requestId, 400);
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return errorResponse(new Error('Supabase no está configurado'), context.requestId, 500);
    }

    const { data, error } = await supabase
      .from('customers')
      .update({ user_id: body.userId })
      .eq('id', id)
      .select('id, full_name, user_id')
      .single();

    if (error) {
      logServerError({ area: 'admin.customers', action: 'link', requestId: context.requestId, error });
      return errorResponse(error, context.requestId, 500);
    }

    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'customer_user_linked',
      entity: 'customer',
      entityId: id,
      metadata: { userId: body.userId, customerName: data.full_name },
    });

    return NextResponse.json({ customer: data }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.customers', action: 'link', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
