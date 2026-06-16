import type { ProductCreateInput } from '@/lib/repositories/productRepository';

export type ImportedProductData = {
  name: string;
  description: string;
  images: string[];
  referencePrice: number | null;
  source: 'mitiendanube' | 'mercadolibre' | 'unknown';
  rawData?: unknown;
};

function detectSource(url: string): 'mitiendanube' | 'mercadolibre' | 'unknown' {
  if (url.includes('mitiendanube.com')) return 'mitiendanube';
  if (url.includes('mercadolibre.com')) return 'mercadolibre';
  return 'unknown';
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Error al obtener la página: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractMetaTag(html: string, property: string): string | null {
  const regex = new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]+)"`, 'i');
  const match = html.match(regex);
  return match ? match[1] : null;
}

function extractAllImages(html: string, baseUrl: string): string[] {
  const images = new Set<string>();
  
  // Extraer imágenes de data-srcset y srcset
  const srcsetRegex = /data-srcset=['"]([^'"]+)['"]/g;
  let match;
  while ((match = srcsetRegex.exec(html)) !== null) {
    const urls = match[1].split(',').map(s => s.trim().split(' ')[0]);
    urls.forEach(url => {
      if (url.startsWith('//')) images.add('https:' + url);
      else if (url.startsWith('http')) images.add(url);
    });
  }

  // Extraer imágenes de data-src
  const dataSrcRegex = /data-src=['"]([^'"]+)['"]/g;
  while ((match = dataSrcRegex.exec(html)) !== null) {
    const url = match[1];
    if (url.startsWith('//')) images.add('https:' + url);
    else if (url.startsWith('http')) images.add(url);
  }

  // Extraer imágenes de src grandes (no thumbnails)
  const srcRegex = /src=['"](https?:\/\/[^'"]+\.(?:png|jpg|jpeg|webp))['"]/gi;
  while ((match = srcRegex.exec(html)) !== null) {
    const url = match[1];
    // Filtrar thumbnails muy pequeños
    if (!url.includes('-50-') && !url.includes('-100-')) {
      images.add(url);
    }
  }

  return Array.from(images);
}

function extractPriceFromHtml(html: string): number | null {
  // Buscar precio en meta tags
  const priceMatch = html.match(/<meta[^>]+property="tiendanube:price"[^>]+content="(\d+)"/i);
  if (priceMatch) {
    return Number(priceMatch[1]);
  }

  // Buscar en JSON embebido
  const jsonMatch = html.match(/"price_number":\s*(\d+)/);
  if (jsonMatch) {
    return Number(jsonMatch[1]);
  }

  return null;
}

async function parseMitiendaNube(url: string): Promise<ImportedProductData> {
  const html = await fetchHtml(url);

  const name = extractMetaTag(html, 'og:title') || '';
  const description = extractMetaTag(html, 'og:description') || '';
  const images = extractAllImages(html, url);
  const referencePrice = extractPriceFromHtml(html);

  return {
    name,
    description,
    images,
    referencePrice,
    source: 'mitiendanube',
  };
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const match = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    return null;
  }
}

function extractMercadoLibreName(html: string): string {
  const og = extractMetaTag(html, 'og:title');
  if (og) return og;

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].replace(/ \| MercadoLibre.*$/, '').trim();

  return '';
}

function extractMercadoLibreDescription(html: string): string {
  const og = extractMetaTag(html, 'og:description');
  if (og) return og;

  const metaDesc = extractMetaTag(html, 'description');
  if (metaDesc) return metaDesc;

  const jsonLd = extractJsonLd(html);
  if (jsonLd?.description && typeof jsonLd.description === 'string') return jsonLd.description;

  return '';
}

function extractMercadoLibrePrice(html: string): number | null {
  const jsonLd = extractJsonLd(html);
  const offers = jsonLd?.offers as { price?: number } | undefined;
  if (offers?.price) return Number(offers.price);

  const priceMatch = html.match(/"price":\s*(\d+\.?\d*)/i);
  if (priceMatch) return Number(priceMatch[1]);

  return null;
}

function extractMercadoLibreImages(html: string): string[] {
  const images = new Set<string>();

  // JSON-LD images
  const jsonLd = extractJsonLd(html);
  if (jsonLd?.image) {
    const imgList = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
    for (const img of imgList) {
      if (typeof img === 'string' && img.startsWith('http')) images.add(img);
    }
  }

  // Buscar imágenes en estado inicial de la app
  const stateMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/);
  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const pics = state?.initialState?.productDetail?.pictures || state?.product?.pictures || [];
      for (const pic of pics) {
        const url = pic.url || pic.secure_url || pic.original || pic.max || pic['640w'] || pic['1200w'];
        if (url && typeof url === 'string' && !url.includes('video')) images.add(url);
      }
    } catch { /* ignore */ }
  }

  // Fallback: src grandes
  const srcRegex = /src=['"](https?:\/\/[^'"]+\.(?:png|jpg|jpeg|webp))['"]/gi;
  let match;
  while ((match = srcRegex.exec(html)) !== null) {
    const url = match[1];
    if (!url.includes('-50-') && !url.includes('-100-')) images.add(url);
  }

  return Array.from(images);
}

function extractMercadoLibreId(url: string): string | null {
  const m = url.match(/MLA-?(\d{7,})/i);
  return m ? `MLA${m[1]}` : null;
}

function readMercadoLibreToken(): string | undefined {
  return process.env.MERCADO_LIBRE_ACCESS_TOKEN?.trim() || undefined;
}

async function parseMercadoLibreViaApi(url: string): Promise<ImportedProductData | null> {
  const itemId = extractMercadoLibreId(url);
  if (!itemId) return null;

  const token = readMercadoLibreToken();
  if (!token) return null;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const itemResp = await fetch(`https://api.mercadolibre.com/items/${itemId}`, { headers });
  if (!itemResp.ok) return null;

  const itemData = await itemResp.json();

  let description = '';
  const descResp = await fetch(`https://api.mercadolibre.com/items/${itemId}/description`, { headers });
  if (descResp.ok) {
    const descData = await descResp.json();
    description = descData.plain_text || descData.text || '';
  }

  const images: string[] = [];
  if (itemData.pictures && Array.isArray(itemData.pictures)) {
    itemData.pictures.forEach((pic: { url: string }) => {
      if (pic.url && !pic.url.includes('video')) images.push(pic.url);
    });
  }

  return {
    name: itemData.title || '',
    description,
    images,
    referencePrice: itemData.price || null,
    source: 'mercadolibre',
  };
}

async function parseMercadoLibre(url: string): Promise<ImportedProductData> {
  // Intentar via API con token (funciona para productos propios)
  const viaApi = await parseMercadoLibreViaApi(url);
  if (viaApi) return viaApi;

  const itemId = extractMercadoLibreId(url);
  const tokenAvailable = !!readMercadoLibreToken();

  if (tokenAvailable) {
    throw new Error(
      'No se pudo importar el producto de MercadoLibre. ' +
      'La API solo permite importar tus propias publicaciones. ' +
      (itemId ? `El producto ${itemId} pertenece a otro vendedor. ` : '') +
      'Copiá los datos manualmente o usá un producto propio.'
    );
  }

  throw new Error(
    'No se pudo importar el producto de MercadoLibre. ' +
    'Configurá MERCADO_LIBRE_ACCESS_TOKEN en .env.local para importar tus propias publicaciones. ' +
    'Obtené tu token en: https://developers.mercadolibre.com.ar/'
  );
}

export async function importProductFromUrl(url: string): Promise<ImportedProductData> {
  const source = detectSource(url);

  if (source === 'unknown') {
    throw new Error('URL no reconocida. Solo se soportan MitiendaNube y MercadoLibre.');
  }

  if (source === 'mitiendanube') {
    return parseMitiendaNube(url);
  }

  if (source === 'mercadolibre') {
    return parseMercadoLibre(url);
  }

  throw new Error('Fuente no soportada');
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 100);
}

export function convertToProductCreateInput(data: ImportedProductData): Partial<ProductCreateInput> {
  return {
    name: data.name,
    slug: slugify(data.name),
    description: data.description,
    imageUrl: data.images[0] || null,
    carouselImages: data.images,
    price: 0, // El usuario debe ajustar el precio
    stock: 0,
    status: 'ACTIVE',
    featured: false,
    categoryId: null,
    compareAtPrice: null,
    discountLabel: null,
  };
}
