import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { deleteAdminProductImage, uploadAdminProductImage } from '@/lib/services/admin/productImages';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { measureAsync } from '@/lib/server/runtimeMetrics';

export async function POST(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const formData = await request.formData();
    const productId = formData.get('productId');
    const file = formData.get('file');

    if (typeof productId !== 'string' || !productId) {
      return errorResponse(new Error('Producto inválido'), context.requestId, 400);
    }

    if (!(file instanceof File)) {
      return errorResponse(new Error('Imagen inválida'), context.requestId, 400);
    }

    const image = await measureAsync('admin.products.images', 'upload', () => uploadAdminProductImage(productId, file), context.requestId);

    return NextResponse.json({ image }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.products.images', action: 'upload', entity: 'product', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 400);
  }
}

export async function DELETE(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const payload = await request.json() as { productId?: unknown; url?: unknown };

    if (typeof payload.url !== 'string' || !payload.url) {
      return errorResponse(new Error('URL inválida'), context.requestId, 400);
    }

    const productId = typeof payload.productId === 'string' ? payload.productId : undefined;
    const deleted = await measureAsync('admin.products.images', 'delete', () => deleteAdminProductImage(payload.url as string, productId), context.requestId);

    return NextResponse.json({ deleted }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.products.images', action: 'delete', entity: 'product', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 400);
  }
}
