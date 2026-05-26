import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { deleteAdminProductImage, uploadAdminProductImage } from '@/lib/services/admin/productImages';

export async function POST(request: Request) {
  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const formData = await request.formData();
    const productId = formData.get('productId');
    const file = formData.get('file');

    if (typeof productId !== 'string' || !productId) {
      return NextResponse.json({ message: 'Producto inválido' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Imagen inválida' }, { status: 400 });
    }

    const image = await uploadAdminProductImage(productId, file);

    return NextResponse.json({ image });
  } catch (error) {
    console.error('Error uploading product image:', error);
    const message = error instanceof Error ? error.message : 'No se pudo subir la imagen';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const payload = await request.json() as { url?: unknown };

    if (typeof payload.url !== 'string' || !payload.url) {
      return NextResponse.json({ message: 'URL inválida' }, { status: 400 });
    }

    const deleted = await deleteAdminProductImage(payload.url);

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error('Error deleting product image:', error);
    const message = error instanceof Error ? error.message : 'No se pudo eliminar la imagen';
    return NextResponse.json({ message }, { status: 400 });
  }
}
