import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { getCollectionRoute } from '@/lib/services/creditAccountService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function GET(request: Request) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const route = await getCollectionRoute();

    return NextResponse.json(
      { route },
      { headers: { 'x-request-id': requestContext.requestId } }
    );
  } catch (error) {
    logServerError({
      area: 'admin.creditAccounts',
      action: 'collectionRoute',
      entity: 'creditAccount',
      requestId: requestContext.requestId,
      error,
    });
    return errorResponse(error, requestContext.requestId, 500);
  }
}
