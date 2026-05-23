import { adaptAdminCatalogProduct, type AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import { allProducts } from '@/lib/products';
import { listActiveCategories } from '@/lib/repositories/categoryRepository';
import {
  createProduct,
  listAllProducts,
  updateProduct,
  type ProductCreateInput,
  type ProductStatus,
  type ProductUpdateInput,
} from '@/lib/repositories/productRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export type AdminCatalogCategory = {
  id: string;
  name: string;
  slug: string;
};

export type AdminCatalogPayload = {
  products: AdminCatalogProduct[];
  categories: AdminCatalogCategory[];
  source: 'supabase' | 'local-fallback';
};

export type AdminProductPayload = {
  categoryId: string | null;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  discountLabel: string;
  stock: number;
  status: ProductStatus;
  featured: boolean;
  imageUrl: string;
  carouselImages: string[];
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text ? text : null;
}

function normalizePrice(value: unknown, fieldName: string): number {
  const numberValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${fieldName} inválido`);
  }

  return numberValue;
}

function normalizeStock(value: unknown): number {
  const numberValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error('Stock inválido');
  }

  return numberValue;
}

function normalizeStatus(value: unknown): ProductStatus {
  if (value === 'ACTIVE' || value === 'INACTIVE' || value === 'OUT_OF_STOCK' || value === 'ARCHIVED') {
    return value;
  }

  return 'ACTIVE';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateProductPayload(payload: Partial<AdminProductPayload>, requireBaseFields: boolean): ProductCreateInput | ProductUpdateInput {
  const name = payload.name === undefined ? undefined : normalizeText(payload.name);
  const slug = payload.slug === undefined ? undefined : normalizeText(payload.slug);

  if (requireBaseFields && !name) throw new Error('El nombre es obligatorio');
  if (requireBaseFields && !slug) throw new Error('El slug es obligatorio');
  if (!requireBaseFields && payload.name !== undefined && !name) throw new Error('El nombre es obligatorio');
  if (!requireBaseFields && payload.slug !== undefined && !slug) throw new Error('El slug es obligatorio');

  return {
    categoryId: payload.categoryId === undefined ? undefined : payload.categoryId,
    name,
    slug,
    description: payload.description === undefined ? undefined : normalizeNullableText(payload.description),
    price: payload.price === undefined ? undefined : normalizePrice(payload.price, 'Precio'),
    compareAtPrice: payload.compareAtPrice === undefined || payload.compareAtPrice === null
      ? payload.compareAtPrice
      : normalizePrice(payload.compareAtPrice, 'Precio anterior'),
    discountLabel: payload.discountLabel === undefined ? undefined : normalizeNullableText(payload.discountLabel),
    stock: payload.stock === undefined ? undefined : normalizeStock(payload.stock),
    status: payload.status === undefined ? undefined : normalizeStatus(payload.status),
    featured: payload.featured,
    imageUrl: payload.imageUrl === undefined ? undefined : normalizeNullableText(payload.imageUrl),
    carouselImages: payload.carouselImages === undefined ? undefined : normalizeStringArray(payload.carouselImages),
  };
}

function getLocalFallbackProducts(): AdminCatalogProduct[] {
  return allProducts.map((product) => ({
    id: `local-${product.id}`,
    legacyProductId: product.id,
    categoryId: null,
    categoryName: product.categoria,
    name: product.name,
    slug: product.slug,
    description: product.description ?? '',
    price: product.priceNumber,
    compareAtPrice: null,
    discountLabel: product.discount ?? '',
    stock: product.stock,
    status: 'ACTIVE',
    featured: product.destacado,
    imageUrl: product.imageUrl ?? '',
    carouselImages: product.carouselImages ?? [],
    createdAt: null,
  }));
}

async function assertValidCategory(categoryId: string | null | undefined): Promise<void> {
  if (categoryId === undefined || categoryId === null) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no está configurado');

  const categories = await listActiveCategories(supabase);
  const exists = categories.some((category) => category.id === categoryId);

  if (!exists) {
    throw new Error('Categoría inválida');
  }
}

async function assertUniqueSlug(productId: string, slug: string | undefined): Promise<void> {
  if (!slug) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no está configurado');

  const products = await listAllProducts(supabase);
  const duplicate = products.find((product) => product.slug === slug && product.id !== productId);

  if (duplicate) {
    throw new Error('El slug ya está en uso');
  }
}

export async function getAdminCatalog(): Promise<AdminCatalogPayload> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      products: getLocalFallbackProducts(),
      categories: [],
      source: 'local-fallback',
    };
  }

  const [products, categories] = await Promise.all([
    listAllProducts(supabase),
    listActiveCategories(supabase),
  ]);

  return {
    products: products.map(adaptAdminCatalogProduct),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })),
    source: 'supabase',
  };
}

export async function createAdminProduct(payload: AdminProductPayload): Promise<AdminCatalogProduct> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const input = validateProductPayload(payload, true) as ProductCreateInput;
  await assertValidCategory(input.categoryId);
  const product = await createProduct(supabase, input);

  return adaptAdminCatalogProduct(product);
}

export async function updateAdminProduct(
  productId: string,
  payload: Partial<AdminProductPayload>
): Promise<AdminCatalogProduct> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const input = validateProductPayload(payload, false) as ProductUpdateInput;
  await assertValidCategory(input.categoryId);
  await assertUniqueSlug(productId, input.slug);
  const product = await updateProduct(supabase, productId, input);

  return adaptAdminCatalogProduct(product);
}
