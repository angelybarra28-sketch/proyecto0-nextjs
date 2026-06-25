'use server';

import { migrateProductImages as migrateImages } from '@/lib/services/productImageMigration';

export type MigrateImagesResult = {
  success: boolean;
  migrated: number;
  failed: number;
  error?: string;
};

export async function migrateProductImagesAction(
  productId: string
): Promise<MigrateImagesResult> {
  try {
    const result = await migrateImages(productId);
    return {
      success: result.migrated > 0 || result.failed === 0,
      migrated: result.migrated,
      failed: result.failed,
    };
  } catch (err) {
    return {
      success: false,
      migrated: 0,
      failed: 0,
      error: err instanceof Error ? err.message : 'Error al migrar imágenes',
    };
  }
}
