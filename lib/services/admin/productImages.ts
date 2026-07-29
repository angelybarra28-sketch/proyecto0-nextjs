import { validateProductImageFile, assertValidProductImagePath } from '@/lib/validation/productos';
import { randomUUID } from 'crypto';
import {
  deleteProductImageObject,
  getProductImagePathFromPublicUrl,
  uploadProductImageObject,
  type StoredProductImage,
} from '@/lib/storage/productImageStorage';
import { getProductById } from '@/lib/repositories/productRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

function getExtension(file: File): string {
  const nameExtension = file.name.split('.').pop()?.toLowerCase();

  if (nameExtension && /^[a-z0-9]+$/.test(nameExtension)) {
    return nameExtension;
  }

  return file.type.split('/')[1] || 'bin';
}

function createProductImagePath(productId: string, file: File): string {
  return `products/${productId}/${Date.now()}-${randomUUID()}.${getExtension(file)}`;
}

export async function uploadAdminProductImage(productId: string, file: File): Promise<StoredProductImage> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  validateProductImageFile(file);

  const product = await getProductById(supabase, productId);

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  return uploadProductImageObject(supabase, file, createProductImagePath(productId, file));
}

export async function deleteAdminProductImage(url: string, productId?: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const path = getProductImagePathFromPublicUrl(url);

  if (!path) {
    return false;
  }

  assertValidProductImagePath(path, productId);

  await deleteProductImageObject(supabase, path);
  return true;
}
