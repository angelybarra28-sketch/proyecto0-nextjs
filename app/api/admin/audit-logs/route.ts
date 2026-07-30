import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { queryAuditLogs, listAuditActions, listAuditEntities } from '@/lib/services/admin/auditService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const url = new URL(request.url);
    const mode = url.searchParams.get('mode');

    if (mode === 'actions') {
      const actions = await listAuditActions();
      return NextResponse.json({ actions }, { headers: { 'x-request-id': context.requestId } });
    }

    if (mode === 'entities') {
      const entities = await listAuditEntities();
      return NextResponse.json({ entities }, { headers: { 'x-request-id': context.requestId } });
    }

    const result = await queryAuditLogs({
      page: Number(url.searchParams.get('page')) || 1,
      pageSize: Number(url.searchParams.get('pageSize')) || 50,
      action: url.searchParams.get('action') || undefined,
      entity: url.searchParams.get('entity') || undefined,
      userId: url.searchParams.get('userId') || undefined,
      dateFrom: url.searchParams.get('dateFrom') || undefined,
      dateTo: url.searchParams.get('dateTo') || undefined,
    });

    return NextResponse.json(result, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.auditLogs', action: 'list', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
