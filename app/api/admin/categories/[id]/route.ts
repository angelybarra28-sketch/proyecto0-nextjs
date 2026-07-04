import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { updateAdminCategory, deleteAdminCategory } from '@/lib/services/adminCategoryService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { measureAsync } from '@/lib/server/runtimeMetrics';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await context.params;
    const payload = await request.json();
    const category = await measureAsync('admin.categories', 'update', () => updateAdminCategory(id, payload), requestContext.requestId);
    return NextResponse.json({ category }, { headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    const { id } = await context.params;
    logServerError({ area: 'admin.categories', action: 'update', entity: 'category', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 400);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await context.params;
    await measureAsync('admin.categories', 'delete', () => deleteAdminCategory(id), requestContext.requestId);
    return NextResponse.json({ success: true }, { headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    const { id } = await context.params;
    logServerError({ area: 'admin.categories', action: 'delete', entity: 'category', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 400);
  }
}
