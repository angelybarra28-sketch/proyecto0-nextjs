import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { getProductById } from '@/lib/repositories/productRepository';

const SUPABASE_STORAGE_HOST = '/storage/v1/object/public/';

function isExternalUrl(url: string): boolean {
  return !url.includes(SUPABASE_STORAGE_HOST);
}

function getExtension(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  if (ext && /^(jpg|jpeg|png|webp|gif)$/.test(ext)) return ext;
  return 'webp';
}

async function downloadAndUpload(supabase: ReturnType<typeof getSupabaseAdminClient>, productId: string, url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageMigrator/1.0)',
      },
    });
    if (!response.ok) {
      console.error(`Failed to download image: ${url} (${response.status})`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || `image/${getExtension(url)}`;
    const path = `products/${productId}/${Date.now()}-${crypto.randomUUID()}.${getExtension(url)}`;

    const { error } = await supabase!.storage
      .from('product-images')
      .upload(path, buffer, {
        contentType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading migrated image:', error);
      return null;
    }

    const { data } = supabase!.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error('Error migrating image:', url, err);
    return null;
  }
}

export async function migrateProductImages(productId: string): Promise<{ migrated: number; failed: number }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no está configurado');

  const product = await getProductById(supabase, productId);
  if (!product) throw new Error('Producto no encontrado');

  const currentImageUrl = product.image_url;
  const currentCarousel = Array.isArray(product.carousel_images)
    ? product.carousel_images as string[]
    : [];

  const allUrls = new Map<string, string>();
  if (currentImageUrl && isExternalUrl(currentImageUrl)) {
    allUrls.set('main', currentImageUrl);
  }
  currentCarousel.forEach((url, i) => {
    if (isExternalUrl(url)) {
      allUrls.set(`carousel-${i}`, url);
    }
  });

  if (allUrls.size === 0) return { migrated: 0, failed: 0 };

  let migrated = 0;
  let failed = 0;
  const urlMap = new Map<string, string>();

  for (const [key, url] of allUrls) {
    const newUrl = await downloadAndUpload(supabase, productId, url);
    if (newUrl) {
      urlMap.set(url, newUrl);
      migrated++;
    } else {
      failed++;
    }
  }

  if (migrated === 0) return { migrated: 0, failed };

  const newImageUrl = currentImageUrl && urlMap.has(currentImageUrl)
    ? urlMap.get(currentImageUrl)!
    : currentImageUrl;

  const newCarousel = currentCarousel.map((url) => urlMap.get(url) ?? url);

  const updatePayload: Record<string, unknown> = {};
  if (currentImageUrl && urlMap.has(currentImageUrl)) {
    updatePayload.image_url = newImageUrl;
  }
  updatePayload.carousel_images = newCarousel;

  const { error } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', productId);

  if (error) {
    console.error('Error updating product after image migration:', error);
    return { migrated: 0, failed: allUrls.size };
  }

  return { migrated, failed };
}
