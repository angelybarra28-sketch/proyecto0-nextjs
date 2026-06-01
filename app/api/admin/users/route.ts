import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { listAdminUsers } from '@/lib/services/adminUserService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { normalizePage, normalizeLimit, createPagination } from '@/lib/services/admin/types';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const url = new URL(request.url);
    const rawPage = url.searchParams.get('page');
    const rawLimit = url.searchParams.get('limit');

    if (rawPage !== null || rawLimit !== null) {
      const page = normalizePage(rawPage);
      const limit = normalizeLimit(rawLimit, 50, 100);

      const { users, total } = await listAdminUsers({ page, limit });
      const pagination = createPagination(page, limit, total ?? 0);

      return NextResponse.json(
        {
          users,
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
        },
        { headers: { 'x-request-id': context.requestId } }
      );
    }

    const { users } = await listAdminUsers();

    return NextResponse.json({ users }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.users', action: 'list', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
