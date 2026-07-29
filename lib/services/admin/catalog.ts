import { adaptAdminCatalogProduct, type AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
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
import { normalizeText, normalizeNullableText } from '@/lib/validation/common';
import { normalizePrice, normalizeStock, normalizeStatus, normalizeStringArray } from '@/lib/validation/productos';
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
  parentId: string | null;
};

export type AdminCatalogPayload = {
  products: AdminCatalogProduct[];
  categories: AdminCatalogCategory[];
} & AdminListResponse<AdminCatalogProduct, AdminProductFilters, AdminProductSorting>;

export type AdminProductFilters = {
  search: string;
  status: ProductStatus | 'all';
  featured: 'all' | 'featured' | 'not-featured';
  categoryId: string;
  size: string;
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
  size?: unknown;
  sortKey?: unknown;
  direction?: unknown;
  page?: unknown;
  limit?: unknown;
};

export type AdminProductPayload = {
  categoryId: string | null;
  categoryIds: string[];
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
  tendencias: boolean;
  imageUrl: string;
  carouselImages: string[];
};

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
    size: normalizeText(input.size),
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

  const categoryIds = payload.categoryIds === undefined ? undefined : normalizeStringArray(payload.categoryIds);
  const categoryId = categoryIds !== undefined
    ? (categoryIds[0] ?? null)
    : (payload.categoryId === undefined ? undefined : payload.categoryId);

  return {
    categoryId,
    categoryIds: categoryIds ?? [],
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
    tendencias: payload.tendencias,
    imageUrl: payload.imageUrl === undefined ? undefined : normalizeNullableText(payload.imageUrl),
    carouselImages: payload.carouselImages === undefined ? undefined : normalizeStringArray(payload.carouselImages),
  };
}



async function assertValidCategories(categoryIds: string[] | undefined): Promise<void> {
  if (!categoryIds || categoryIds.length === 0) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no está configurado');

  const categories = await listActiveCategories(supabase);
  const validIds = new Set(categories.map(c => c.id));

  for (const id of categoryIds) {
    if (!validIds.has(id)) {
      throw new Error(`Categoría inválida: ${id}`);
    }
  }
}

async function assertValidCategory(categoryId: string | null | undefined): Promise<void> {
  if (categoryId === undefined || categoryId === null) return;
  await assertValidCategories([categoryId]);
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

export async function getAdminCatalog(input: AdminProductListInput = {}): Promise<AdminCatalogPayload> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const limit = normalizeLimit(input.limit);
  const isUnlimited = limit === -1;
  const page = isUnlimited ? 1 : normalizePage(input.page);
  const filters = normalizeProductFilters(input);
  const sorting = normalizeProductSorting(input);

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
  const totalPages = isUnlimited ? 1 : Math.max(1, Math.ceil(result.total / limit));
  const resolvedPage = isUnlimited ? 1 : Math.min(page, totalPages);

  if (!isUnlimited && resolvedPage !== page) {
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
      parentId: category.parent_id,
    })),
    pagination: createPagination(resolvedPage, isUnlimited ? result.total : limit, result.total),
    filters,
    sorting,
    error: null,
  };
}

export async function createAdminProduct(payload: AdminProductPayload): Promise<AdminCatalogProduct> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const input = validateProductPayload(payload, true) as ProductCreateInput;
  await assertValidCategories(input.categoryIds);
  if (input.categoryId && !input.categoryIds.includes(input.categoryId)) {
    input.categoryIds = [input.categoryId, ...input.categoryIds];
  }
  await assertUniqueSlug('', input.slug);
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
  await assertValidCategories(input.categoryIds);
  if (input.categoryId && input.categoryIds && !input.categoryIds.includes(input.categoryId)) {
    input.categoryIds = [input.categoryId, ...input.categoryIds];
  }
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
