import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'proveedor-adjuntos';

export type StoredAdjunto = {
  path: string;
  url: string;
};

export async function uploadProveedorAdjunto(
  supabase: SupabaseClient,
  file: File,
  path: string
): Promise<StoredAdjunto> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { path, url: data.publicUrl };
}

export async function deleteProveedorAdjunto(
  supabase: SupabaseClient,
  path: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) throw error;
}

export function getAdjuntoPath(compraId: string, tipo: string, fileName: string): string {
  const timestamp = Date.now();
  const ext = fileName.split('.').pop() ?? 'bin';
  return `compras/${compraId}/${tipo}/${timestamp}.${ext}`;
}
