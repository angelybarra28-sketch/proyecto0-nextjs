import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { getSmartDashboard } from '@/lib/services/admin/smart-dashboard';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const result = await getSmartDashboard();

    return NextResponse.json(result, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.smartDashboard', action: 'load', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
