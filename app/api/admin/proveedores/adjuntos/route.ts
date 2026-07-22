import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { createAdjunto } from '@/lib/services/admin/proveedores';
import { uploadProveedorAdjunto, getAdjuntoPath } from '@/lib/storage/proveedorAdjuntos';

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const compraId = formData.get('compra_id') as string | null;
    const tipo = (formData.get('tipo') as string | null) ?? 'factura';

    if (!file || !compraId) {
      return errorResponse(new Error('Archivo y compra_id son requeridos'), context.requestId, 400);
    }

    if (file.size > 10 * 1024 * 1024) {
      return errorResponse(new Error('El archivo no puede superar los 10MB'), context.requestId, 400);
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return errorResponse(new Error('Supabase no disponible'), context.requestId, 500);
    }

    const path = getAdjuntoPath(compraId, tipo, file.name);
    const { path: storedPath, url } = await uploadProveedorAdjunto(supabase, file, path);

    const adjunto = await createAdjunto({
      compra_id: compraId,
      tipo: tipo as any,
      nombre_original: file.name,
      path: storedPath,
      url,
    });

    return NextResponse.json({ adjunto }, { status: 201, headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.adjuntos', action: 'upload', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
