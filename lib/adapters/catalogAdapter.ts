import type { Product } from '@/lib/types';

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
  stock: number;
  status: CatalogProductRow['status'];
  featured: boolean;
  imageUrl: string;
  carouselImages: string[];
  createdAt: string | null;
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

export function adaptCatalogProduct(row: CatalogProductRow): Product {
  const priceNumber = toNumber(row.price);
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  const categoryName = category?.name ?? 'Sin categoría';

  return {
    id: row.legacy_product_id ?? 0,
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
    specifications: toSpecifications(row.specifications),
    features: toStringArray(row.features),
  };
}

export function adaptAdminCatalogProduct(row: CatalogProductRow): AdminCatalogProduct {
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;

  return {
    id: row.id,
    legacyProductId: row.legacy_product_id,
    categoryId: row.category_id,
    categoryName: category?.name ?? 'Sin categoría',
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    price: toNumber(row.price),
    compareAtPrice: row.compare_at_price === null ? null : toNumber(row.compare_at_price),
    discountLabel: row.discount_label ?? '',
    stock: row.stock,
    status: row.status,
    featured: row.featured,
    imageUrl: row.image_url ?? '',
    carouselImages: toStringArray(row.carousel_images),
    createdAt: row.created_at ?? null,
  };
}
