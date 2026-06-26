import type { Product } from '@/lib/types';
import { normalizeSize } from '@/lib/sizeUtils';

export type CatalogCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
};

export type CatalogProductRow = {
  id: string;
  legacy_product_id: number | null;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  discount_label: string | null;
  reference_price: number | null;
  stock: number;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED';
  featured: boolean;
  image_url: string | null;
  carousel_images: unknown;
  specifications: unknown;
  features: unknown;
  created_at?: string;
  categories: Pick<CatalogCategoryRow, 'name' | 'slug'> | Array<Pick<CatalogCategoryRow, 'name' | 'slug'>> | null;
};

export type AdminCatalogProduct = {
  id: string;
  legacyProductId: number | null;
  categoryId: string | null;
  categoryName: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  discountLabel: string;
  referencePrice: number | null;
  installmentCount: number | null;
  installmentAmount: number | null;
  stock: number;
  status: CatalogProductRow['status'];
  featured: boolean;
  imageUrl: string;
  carouselImages: string[];
  createdAt: string | null;
  size: string | null;
};

const defaultSpecifications = {
  size: 'N/A',
  material: 'N/A',
  firmness: 'N/A',
  withPillow: 'No',
  color: 'N/A',
};

function formatPrice(value: number): string {
  return `$${Math.round(value).toLocaleString('es-AR')}`;
}

function toNumber(value: number | string | null): number {
  if (value === null) return 0;
  return typeof value === 'number' ? value : Number(value);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function stableNumericId(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = ((hash << 5) - hash) + uuid.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function toSpecifications(value: unknown): Product['specifications'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaultSpecifications;
  }

  const specs = value as Partial<Record<keyof typeof defaultSpecifications, unknown>>;

  return {
    size: typeof specs.size === 'string' ? specs.size : defaultSpecifications.size,
    material: typeof specs.material === 'string' ? specs.material : defaultSpecifications.material,
    firmness: typeof specs.firmness === 'string' ? specs.firmness : defaultSpecifications.firmness,
    withPillow: typeof specs.withPillow === 'string' ? specs.withPillow : defaultSpecifications.withPillow,
    color: typeof specs.color === 'string' ? specs.color : defaultSpecifications.color,
  };
}

function extractSize(specs: unknown): string | null {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return null;
  const obj = specs as Record<string, unknown>;
  const size = obj.size;
  const raw = typeof size === 'string' && size !== 'N/A' ? size.trim() : null;
  return raw ? normalizeSize(raw) : null;
}

function extractInstallments(specs: unknown): { installmentCount?: number; installmentAmount?: number } {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return {};
  const obj = specs as Record<string, unknown>;
  return {
    installmentCount: typeof obj.installment_count === 'number' ? obj.installment_count
      : typeof obj.installment_count === 'string' ? Number(obj.installment_count)
      : undefined,
    installmentAmount: typeof obj.installment_amount === 'number' ? obj.installment_amount
      : typeof obj.installment_amount === 'string' ? Number(obj.installment_amount)
      : undefined,
  };
}

export function adaptCatalogProduct(row: CatalogProductRow): Product {
  const priceNumber = toNumber(row.price);
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  const categoryName = category?.name ?? 'Sin categorÃ­a';
  const installments = extractInstallments(row.specifications);
  const installmentCount = installments.installmentCount ?? 8;
  const installmentAmount = installments.installmentAmount ?? Math.round(priceNumber / installmentCount);

  return {
    id: row.legacy_product_id ?? stableNumericId(row.id),
    name: row.name,
    price: formatPrice(priceNumber),
    priceNumber,
    discount: row.discount_label ?? undefined,
    imageUrl: row.image_url ?? undefined,
    carouselImages: toStringArray(row.carousel_images),
    description: row.description ?? '',
    slug: row.slug,
    categoria: categoryName,
    stock: row.stock,
    destacado: row.featured,
    category: categoryName,
    referencePrice: row.reference_price ?? undefined,
    installmentCount,
    installmentAmount,
    specifications: toSpecifications(row.specifications),
    features: toStringArray(row.features),
  };
}

export function adaptAdminCatalogProduct(row: CatalogProductRow): AdminCatalogProduct {
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  const installments = extractInstallments(row.specifications);

  return {
    id: row.id,
    legacyProductId: row.legacy_product_id,
    categoryId: row.category_id,
    categoryName: category?.name ?? 'Sin categorÃ­a',
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    price: toNumber(row.price),
    compareAtPrice: row.compare_at_price === null ? null : toNumber(row.compare_at_price),
    discountLabel: row.discount_label ?? '',
    referencePrice: row.reference_price ?? null,
    installmentCount: installments.installmentCount ?? null,
    installmentAmount: installments.installmentAmount ?? null,
    size: extractSize(row.specifications),
    stock: row.stock,
    status: row.status,
    featured: row.featured,
    imageUrl: row.image_url ?? '',
    carouselImages: toStringArray(row.carousel_images),
    createdAt: row.created_at ?? null,
  };
}

