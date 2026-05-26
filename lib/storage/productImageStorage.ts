import type { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_BUCKET = 'product-images';

export type StoredProductImage = {
  path: string;
  url: string;
};

export function getProductImagesBucket(): string {
  return process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || DEFAULT_BUCKET;
}

export async function uploadProductImageObject(
  supabase: SupabaseClient,
  file: File,
  path: string
): Promise<StoredProductImage> {
  const bucket = getProductImagesBucket();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    url: data.publicUrl,
  };
}

export async function deleteProductImageObject(
  supabase: SupabaseClient,
  path: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(getProductImagesBucket())
    .remove([path]);

  if (error) {
    throw error;
  }
}

export function getProductImagePathFromPublicUrl(url: string): string | null {
  const bucket = getProductImagesBucket();

  try {
    const parsedUrl = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = parsedUrl.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(parsedUrl.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}
