import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { listAllProducts, updateProduct } from '@/lib/repositories/productRepository';
import type { CatalogProductRow } from '@/lib/adapters/catalogAdapter';

const ENOVA_CLOUDINARY_BASE = 'https://res.cloudinary.com/phinx-lab/image/upload';
const ENOVA_API_BASE = 'https://api.enovastore.com.ar';
const SUPABASE_STORAGE_HOST = '/storage/v1/object/public/';

const OLD_ENOVA_URL_RE = /res\.cloudinary\.com\/phinx-lab\/image\/upload\/(?!f_auto)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(.+?)(?:\?v=\d+)?$/i;

interface EnovaPublication {
  id: string;
  attributes: {
    features: Array<{
      name: string;
      features: Array<{
        name: string;
        value?: string;
      }>;
    }>;
  };
}

function extractEnovaSku(features: EnovaPublication['attributes']['features']): string | null {
  const generals = features.find(f => f.name === 'Generales');
  if (!generals) return null;
  const skuFeature = generals.features.find(f => f.name === 'SKU');
  if (!skuFeature?.value) return null;
  return skuFeature.value.replace(/\//g, '');
}

function parseOldEnovaUrl(url: string): { uuid: string; imageRef: string } | null {
  const match = url.match(OLD_ENOVA_URL_RE);
  if (!match) return null;
  return { uuid: match[1], imageRef: match[2] };
}

function buildNewEnovaUrl(sku: string, imageRef: string): string {
  return `${ENOVA_CLOUDINARY_BASE}/f_auto,q_auto,w_auto/Ster/Products/${sku}/${imageRef}`;
}

function rewriteUrl(url: string, skuMap: Map<string, string>): string {
  const parsed = parseOldEnovaUrl(url);
  if (!parsed) return url;
  const sku = skuMap.get(parsed.uuid);
  if (!sku) return url;
  return buildNewEnovaUrl(sku, parsed.imageRef);
}

function isExternalUrl(url: string): boolean {
  return !url.includes(SUPABASE_STORAGE_HOST);
}

function getExtension(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  if (ext && /^(jpg|jpeg|png|webp|gif)$/.test(ext)) return ext;
  return 'webp';
}

async function fetchEnovaSku(uuid: string): Promise<string | null> {
  try {
    const response = await fetch(`${ENOVA_API_BASE}/publication/${uuid}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    if (!response.ok) return null;
    const pubs: EnovaPublication[] = await response.json();
    if (!pubs || pubs.length === 0) return null;
    return extractEnovaSku(pubs[0].attributes.features);
  } catch {
    return null;
  }
}

async function downloadAndUpload(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  productId: string,
  url: string,
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ImageMigrator/1.0)' },
    });
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || `image/${getExtension(url)}`;
    const path = `products/${productId}/${Date.now()}-${crypto.randomUUID()}.${getExtension(url)}`;

    const { error } = await supabase!.storage
      .from('product-images')
      .upload(path, buffer, { contentType, cacheControl: '31536000', upsert: false });

    if (error) return null;

    const { data } = supabase!.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

import { toStringArray } from '@/lib/utils';

export type EnovaUrlMigrationResult = {
  totalProducts: number;
  fixedUrls: number;
  downloadedImages: number;
  failedDownloads: number;
  missingSkus: string[];
  alreadyDone: boolean;
};

export async function migrateEnovaUrls(): Promise<EnovaUrlMigrationResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase admin client unavailable');

  const products = await listAllProducts(supabase);

  const hasOldUrls = products.some(p => {
    if (p.image_url && parseOldEnovaUrl(p.image_url)) return true;
    return toStringArray(p.carousel_images).some(url => parseOldEnovaUrl(url));
  });

  if (!hasOldUrls) {
    return { totalProducts: products.length, fixedUrls: 0, downloadedImages: 0, failedDownloads: 0, missingSkus: [], alreadyDone: true };
  }

  const uuidsNeeded = new Set<string>();
  for (const product of products) {
    if (product.image_url) {
      const parsed = parseOldEnovaUrl(product.image_url);
      if (parsed) uuidsNeeded.add(parsed.uuid);
    }
    for (const url of toStringArray(product.carousel_images)) {
      const parsed = parseOldEnovaUrl(url);
      if (parsed) uuidsNeeded.add(parsed.uuid);
    }
  }

  const skuMap = new Map<string, string>();
  const missingSkus: string[] = [];
  for (const uuid of uuidsNeeded) {
    const sku = await fetchEnovaSku(uuid);
    if (sku) skuMap.set(uuid, sku);
    else missingSkus.push(uuid);
  }

  let fixedUrls = 0;
  let downloadedImages = 0;
  let failedDownloads = 0;

  for (const product of products) {
    const oldImageUrls = new Map<string, string>();

    if (product.image_url && parseOldEnovaUrl(product.image_url)) {
      oldImageUrls.set('main', product.image_url);
    }
    toStringArray(product.carousel_images).forEach((url, i) => {
      if (parseOldEnovaUrl(url)) oldImageUrls.set(`carousel-${i}`, url);
    });

    if (oldImageUrls.size === 0) continue;

    const fixedUrlsMap = new Map<string, string>();
    for (const [key, oldUrl] of oldImageUrls) {
      const fixedUrl = rewriteUrl(oldUrl, skuMap);
      fixedUrlsMap.set(key, fixedUrl);
      if (fixedUrl !== oldUrl) fixedUrls++;
    }

    const downloadedMap = new Map<string, string>();
    for (const [key, fixedUrl] of fixedUrlsMap) {
      const supabaseUrl = await downloadAndUpload(supabase, product.id, fixedUrl);
      if (supabaseUrl) {
        downloadedMap.set(key, supabaseUrl);
        downloadedImages++;
      } else {
        failedDownloads++;
      }
    }

    const finalImageUrl = downloadedMap.get('main')
      ?? (fixedUrlsMap.get('main') ?? product.image_url);

    const originalCarousel = toStringArray(product.carousel_images);
    const finalCarousel = originalCarousel.map((url, i) => {
      const downloaded = downloadedMap.get(`carousel-${i}`);
      if (downloaded) return downloaded;
      const fixed = fixedUrlsMap.get(`carousel-${i}`);
      if (fixed) return fixed;
      return url;
    });

    await updateProduct(supabase, product.id, {
      imageUrl: finalImageUrl,
      carouselImages: finalCarousel,
    });
  }

  return { totalProducts: products.length, fixedUrls, downloadedImages, failedDownloads, missingSkus, alreadyDone: false };
}
