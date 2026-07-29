import type { ProductStatus } from '@/lib/repositories/productRepository';

export function normalizePrice(value: unknown, fieldName: string): number {
  const numberValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${fieldName} inválido`);
  }

  return numberValue;
}

export function normalizeStock(value: unknown): number {
  const numberValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error('Stock inválido');
  }

  return numberValue;
}

export function normalizeStatus(value: unknown): ProductStatus {
  if (value === 'ACTIVE' || value === 'INACTIVE' || value === 'OUT_OF_STOCK' || value === 'ARCHIVED') {
    return value;
  }

  return 'ACTIVE';
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function validateProductImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Tipo de imagen no permitido. Usá JPG, PNG, WebP o GIF.');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('La imagen supera el tamaño máximo de 5 MB.');
  }
}

export function assertValidProductImagePath(path: string, productId?: string): void {
  const escapedProductId = productId?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escapedProductId
    ? new RegExp(`^products/${escapedProductId}/[a-zA-Z0-9._-]+$`)
    : /^products\/[0-9a-fA-F-]{36}\/[a-zA-Z0-9._-]+$/;

  if (!pattern.test(path) || path.includes('..')) {
    throw new Error('Ruta de imagen no permitida');
  }
}
