'use server';

import { importProductFromUrl } from '@/lib/services/productImporter';

export type ImportProductFromUrlResult = {
  success: true;
  data: {
    name: string;
    description: string;
    images: string[];
    referencePrice: number | null;
    source: string;
  };
} | {
  success: false;
  error: string;
};

export async function importProductFromUrlAction(
  url: string
): Promise<ImportProductFromUrlResult> {
  try {
    if (!url || !url.startsWith('http')) {
      return {
        success: false,
        error: 'URL inválida. Debe empezar con http:// o https://',
      };
    }

    const data = await importProductFromUrl(url);

    return {
      success: true,
      data: {
        name: data.name,
        description: data.description,
        images: data.images,
        referencePrice: data.referencePrice,
        source: data.source,
      },
    };
  } catch (error) {
    console.error('Error importing product from URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al importar el producto',
    };
  }
}
