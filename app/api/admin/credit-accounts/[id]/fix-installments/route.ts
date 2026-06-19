import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { fixCreditAccountInstallments } from '@/lib/services/creditAccountService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await context.params;

    const result = await fixCreditAccountInstallments(id);

    return NextResponse.json(
      { success: true, installmentCount: result.installmentCount },
      { headers: { 'x-request-id': requestContext.requestId } }
    );
  } catch (error) {
    const { id } = await context.params;
    logServerError({ area: 'admin.creditAccounts', action: 'fixInstallments', entity: 'creditAccount', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 500);
  }
}