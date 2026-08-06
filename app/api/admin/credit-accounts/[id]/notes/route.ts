import { NextResponse } from 'next/server';
import { getAdminUserContext, requireStrictAdminUser } from '@/lib/auth/server';
import { addCollectionNote } from '@/lib/services/creditAccountService';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await params;
    const body = await request.json();

    if (!body.contactType || !body.result) {
      return NextResponse.json(
        { message: 'Faltan campos requeridos (contactType, result)' },
        { status: 400, headers: { 'x-request-id': requestContext.requestId } }
      );
    }

    const note = await addCollectionNote(id, {
      contactType: body.contactType,
      result: body.result,
      notes: body.notes ?? '',
      createdBy: body.createdBy ?? 'Admin',
    });

    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'collection_note_added',
      entity: 'creditAccount',
      entityId: id,
      metadata: { contactType: body.contactType, result: body.result },
    });

    return NextResponse.json({ note }, { status: 201, headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    logServerError({
      area: 'admin.creditAccounts',
      action: 'addCollectionNote',
      entity: 'creditCollectionNote',
      requestId: requestContext.requestId,
      error,
    });
    return errorResponse(error, requestContext.requestId, 500);
  }
}
