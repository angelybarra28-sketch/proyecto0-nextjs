import { NextResponse } from 'next/server';
import { getAdminUserContext, requireStrictAdminUser } from '@/lib/auth/server';
import { previewPortfolioFile } from '@/lib/services/importPortfolioService';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function POST(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse(new Error('No se envió ningún archivo'), context.requestId, 400);
    }

    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isAllowed) {
      return errorResponse(new Error('Formato de archivo no soportado. Use .xlsx, .xls o .csv'), context.requestId, 400);
    }

    const bytes = await file.arrayBuffer();
    const preview = previewPortfolioFile(bytes);

    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'portfolio_preview',
      entity: 'portfolio',
      entityId: null,
      metadata: { fileName: file.name, fileSize: file.size, rowCount: preview.rows?.length ?? 0 },
    });

    return NextResponse.json({ preview }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.importPortfolio', action: 'preview', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
