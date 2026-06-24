import { adaptAdminCatalogProduct, type AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import { allProducts } from '@/lib/products';
import { listActiveCategories } from '@/lib/repositories/categoryRepository';
import {
  createProduct,
  deleteProduct,
  listProductsPaginated,
  listAllProducts,
  updateProduct,
  type ProductListSortKey,
  type ProductCreateInput,
  type ProductStatus,
  type ProductUpdateInput,
} from '@/lib/repositories/productRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import {
  createPagination,
  normalizeLimit,
  normalizePage,
  type AdminListResponse,
  type AdminSortDirection,
} from '@/lib/services/admin/types';

export type AdminCatalogCategory = {
  id: string;
  name: string;
  slug: string;
};

export type AdminCatalogPayload = {
  products: AdminCatalogProduct[];
  categories: AdminCatalogCategory[];
  source: 'supabase' | 'local-fallback';
} & AdminListResponse<AdminCatalogProduct, AdminProductFilters, AdminProductSorting>;

export type AdminProductFilters = {
  search: string;
  status: ProductStatus | 'all';
  featured: 'all' | 'featured' | 'not-featured';
  categoryId: string;
};

export type AdminProductSorting = {
  sortKey: ProductListSortKey;
  direction: AdminSortDirection;
};

export type AdminProductListInput = {
  search?: unknown;
  status?: unknown;
  featured?: unknown;
  categoryId?: unknown;
  sortKey?: unknown;
  direction?: unknown;
  page?: unknown;
  limit?: unknown;
};

export type AdminProductPayload = {
  categoryId: string | null;
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

function normalizeProductFilters(input: AdminProductListInput): AdminProductFilters {
  const status = input.status === 'ACTIVE' || input.status === 'INACTIVE' || input.status === 'OUT_OF_STOCK' || input.status === 'ARCHIVED'
    ? input.status
    : 'all';
  const featured = input.featured === 'featured' || input.featured === 'not-featured' ? input.featured : 'all';

  return {
    search: normalizeText(input.search),
    status,
    featured,
    categoryId: normalizeText(input.categoryId),
  };
}

function normalizeProductSorting(input: AdminProductListInput): AdminProductSorting {
  const validSortKeys: ProductListSortKey[] = ['name', 'category', 'price', 'stock', 'status', 'createdAt'];

  return {
    sortKey: typeof input.sortKey === 'string' && validSortKeys.includes(input.sortKey as ProductListSortKey) ? input.sortKey as ProductListSortKey : 'createdAt',
    direction: input.direction === 'asc' ? 'asc' : 'desc',
  };
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
    referencePrice: payload.referencePrice === undefined || payload.referencePrice === null
      ? payload.referencePrice
      : normalizePrice(payload.referencePrice, 'Precio de referencia'),
    installmentCount: payload.installmentCount === undefined || payload.installmentCount === null
      ? payload.installmentCount
      : normalizeStock(payload.installmentCount),
    installmentAmount: payload.installmentAmount === undefined || payload.installmentAmount === null
      ? payload.installmentAmount
      : normalizePrice(payload.installmentAmount, 'Valor de cuota'),
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
    referencePrice: (product as { referencePrice?: number }).referencePrice ?? null,
    installmentCount: null,
    installmentAmount: null,
    stock: product.stock,
    status: 'ACTIVE',
    featured: product.destacado,
    imageUrl: product.imageUrl ?? '',
    carouselImages: product.carouselImages ?? [],
    createdAt: null,
  }));
}

function filterLocalProducts(products: AdminCatalogProduct[], filters: AdminProductFilters): AdminCatalogProduct[] {
  const search = filters.search.toLowerCase();

  return products
    .filter((product) => !search || [product.name, product.slug, product.categoryName].some((value) => value.toLowerCase().includes(search)))
    .filter((product) => filters.status === 'all' || product.status === filters.status)
    .filter((product) => {
      if (filters.featured === 'featured') return product.featured;
      if (filters.featured === 'not-featured') return !product.featured;
      return true;
    });
}

function sortLocalProducts(products: AdminCatalogProduct[], sorting: AdminProductSorting): AdminCatalogProduct[] {
  return [...products].sort((firstProduct, secondProduct) => {
    const firstValue = sorting.sortKey === 'price' ? firstProduct.price
      : sorting.sortKey === 'stock' ? firstProduct.stock
        : sorting.sortKey === 'status' ? firstProduct.status
          : sorting.sortKey === 'createdAt' ? firstProduct.createdAt ?? ''
            : sorting.sortKey === 'category' ? firstProduct.categoryName
              : firstProduct.name;
    const secondValue = sorting.sortKey === 'price' ? secondProduct.price
      : sorting.sortKey === 'stock' ? secondProduct.stock
        : sorting.sortKey === 'status' ? secondProduct.status
          : sorting.sortKey === 'createdAt' ? secondProduct.createdAt ?? ''
            : sorting.sortKey === 'category' ? secondProduct.categoryName
              : secondProduct.name;

    if (firstValue < secondValue) return sorting.direction === 'asc' ? -1 : 1;
    if (firstValue > secondValue) return sorting.direction === 'asc' ? 1 : -1;
    return firstProduct.name.localeCompare(secondProduct.name, 'es-AR');
  });
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

function buildLocalFallbackCatalog(
  page: number,
  limit: number,
  filters: AdminProductFilters,
  sorting: AdminProductSorting
): AdminCatalogPayload {
  const filteredProducts = sortLocalProducts(filterLocalProducts(getLocalFallbackProducts(), filters), sorting);
  const pagination = createPagination(page, limit, filteredProducts.length);
  const products = filteredProducts.slice((page - 1) * limit, page * limit);

  return {
    success: true,
    data: products,
    products,
    categories: [],
    source: 'local-fallback',
    pagination,
    filters,
    sorting,
    error: null,
  };
}

export async function getAdminCatalog(input: AdminProductListInput = {}): Promise<AdminCatalogPayload> {
  const supabase = getSupabaseAdminClient();
  const page = normalizePage(input.page);
  const limit = normalizeLimit(input.limit);
  const filters = normalizeProductFilters(input);
  const sorting = normalizeProductSorting(input);

  if (!supabase) {
    return buildLocalFallbackCatalog(page, limit, filters, sorting);
  }

  try {
    const categories = await listActiveCategories(supabase);
    const search = filters.search.toLowerCase();
    const searchCategoryIds = search
      ? categories
        .filter((category) => category.name.toLowerCase().includes(search) || category.slug.toLowerCase().includes(search))
        .map((category) => category.id)
      : [];
    let result = await listProductsPaginated(supabase, {
      page,
      limit,
      filters: {
        ...filters,
        searchCategoryIds,
      },
      sorting,
    });
    const totalPages = Math.max(1, Math.ceil(result.total / limit));
    const resolvedPage = Math.min(page, totalPages);

    if (resolvedPage !== page) {
      result = await listProductsPaginated(supabase, {
        page: resolvedPage,
        limit,
        filters: {
          ...filters,
          searchCategoryIds,
        },
        sorting,
      });
    }
    const products = result.products.map(adaptAdminCatalogProduct);

    return {
      success: true,
      data: products,
      products,
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
      })),
      source: 'supabase',
      pagination: createPagination(resolvedPage, limit, result.total),
      filters,
      sorting,
      error: null,
    };
  } catch (error) {
    return buildLocalFallbackCatalog(page, limit, filters, sorting);
  }
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

export async function deleteAdminProduct(productId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  await deleteProduct(supabase, productId);
}
