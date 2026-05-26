import { randomUUID } from 'crypto';
import {
  deleteProductImageObject,
  getProductImagePathFromPublicUrl,
  uploadProductImageObject,
  type StoredProductImage,
} from '@/lib/storage/productImageStorage';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

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

export function validateProductImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Tipo de imagen no permitido. Usá JPG, PNG, WebP o GIF.');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('La imagen supera el tamaño máximo de 5 MB.');
  }
}

export async function uploadAdminProductImage(productId: string, file: File): Promise<StoredProductImage> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  validateProductImageFile(file);

  return uploadProductImageObject(supabase, file, createProductImagePath(productId, file));
}

export async function deleteAdminProductImage(url: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const path = getProductImagePathFromPublicUrl(url);

  if (!path) {
    return false;
  }

  await deleteProductImageObject(supabase, path);
  return true;
}
