import { NextResponse } from 'next/server';
import { getAdminCollectionSummary } from '@/lib/services/adminSalesService';
import { requireAdminUser } from '@/lib/auth/server';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function GET(request: Request) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const summary = await getAdminCollectionSummary();
    return NextResponse.json({ summary }, { headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.collections', action: 'summary', requestId: requestContext.requestId, error });
    return NextResponse.json({ summary: null }, { status: 500, headers: { 'x-request-id': requestContext.requestId } });
  }
}
