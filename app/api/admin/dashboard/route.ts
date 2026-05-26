import { NextResponse } from 'next/server';
import { getAdminDashboard } from '@/lib/services/adminDashboardService';
import { requireAdminUser } from '@/lib/auth/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { measureAsync } from '@/lib/server/runtimeMetrics';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const dashboard = await measureAsync('admin.dashboard', 'load', getAdminDashboard, context.requestId);
    return NextResponse.json({ dashboard }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.dashboard', action: 'load', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
