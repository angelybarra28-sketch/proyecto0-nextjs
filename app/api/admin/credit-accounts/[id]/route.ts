import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { getCreditAccountDetail } from '@/lib/services/creditAccountService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await context.params;

    const account = await getCreditAccountDetail(id);

    return NextResponse.json(
      { account },
      { headers: { 'x-request-id': requestContext.requestId } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('No rows')) {
      return NextResponse.json({ message: 'Cuenta no encontrada' }, { status: 404, headers: { 'x-request-id': requestContext.requestId } });
    }

    const { id } = await context.params;
    logServerError({ area: 'admin.creditAccounts', action: 'detail', entity: 'creditAccount', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 500);
  }
}
