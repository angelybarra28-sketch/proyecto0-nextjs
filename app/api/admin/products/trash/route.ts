import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { listAdminTrashedProducts } from '@/lib/services/admin/trash';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const payload = await listAdminTrashedProducts();
    return NextResponse.json(payload, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.products.trash', action: 'list', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
