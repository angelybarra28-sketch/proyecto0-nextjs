import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { getAdminCategories, createAdminCategory } from '@/lib/services/adminCategoryService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { measureAsync } from '@/lib/server/runtimeMetrics';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const payload = await measureAsync('admin.categories', 'list', () => getAdminCategories(), context.requestId);
    return NextResponse.json(payload, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.categories', action: 'list', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}

export async function POST(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const body = await request.json();
    const category = await measureAsync('admin.categories', 'create', () => createAdminCategory(body), context.requestId);
    return NextResponse.json({ category }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.categories', action: 'create', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
