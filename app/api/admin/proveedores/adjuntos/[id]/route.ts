import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { getAdjuntoPath } from '@/lib/storage/proveedorAdjuntos';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const { id } = await params;
    const supabase = getSupabaseAdminClient();
    if (!supabase) return errorResponse(new Error('Supabase no disponible'), context.requestId, 500);

    const { data: adjunto } = await supabase.from('proveedor_adjuntos').select('path, nombre_original, tipo').eq('id', id).single();
    if (adjunto) {
      await supabase.storage.from('proveedor-adjuntos').remove([adjunto.path]);
    }

    const { error } = await supabase.from('proveedor_adjuntos').delete().eq('id', id);
    if (error) throw new Error(error.message);

    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'proveedor_adjunto_deleted',
      entity: 'proveedorAdjunto',
      entityId: id,
      metadata: adjunto ? { nombreOriginal: adjunto.nombre_original, tipo: adjunto.tipo } : undefined,
    });

    return NextResponse.json({ success: true }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.adjuntos', action: 'delete', entityId: (await params).id, requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
