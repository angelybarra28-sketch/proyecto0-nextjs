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

function extractMercadoLibreId(url: string): string | null {
  // Extraer ID de URLs tipo /p/MLA123456789
  const match = url.match(/\/(?:p|products)\/(MLA\d+)/i);
  if (match) return match[1];
  
  // Extraer ID de URLs de item
  const itemMatch = url.match(/\/items\/(MLA\d+)/i);
  if (itemMatch) return itemMatch[1];

  return null;
}

async function parseMercadoLibre(url: string): Promise<ImportedProductData> {
  const itemId = extractMercadoLibreId(url);
  
  if (!itemId) {
    throw new Error('No se pudo extraer el ID del producto de MercadoLibre. URL debe contener /p/MLA... o /items/MLA...');
  }

  // Fetch item data
  const itemResponse = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!itemResponse.ok) {
    throw new Error(`Error al obtener datos de MercadoLibre: ${itemResponse.status}`);
  }

  const itemData = await itemResponse.json();

  // Fetch description
  const descResponse = await fetch(`https://api.mercadolibre.com/items/${itemId}/description`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  let description = '';
  if (descResponse.ok) {
    const descData = await descResponse.json();
    description = descData.plain_text || descData.text || '';
  }

  // Extraer imágenes (excluir videos)
  const images: string[] = [];
  if (itemData.pictures && Array.isArray(itemData.pictures)) {
    itemData.pictures.forEach((pic: { url: string }) => {
      if (pic.url && !pic.url.includes('video')) {
        images.push(pic.url);
      }
    });
  }

  // Precio de referencia
  const referencePrice = itemData.price || null;

  return {
    name: itemData.title || '',
    description,
    images,
    referencePrice,
    source: 'mercadolibre',
    rawData: itemData,
  };
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
