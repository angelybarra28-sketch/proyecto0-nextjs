import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogProductRow } from '@/lib/adapters/catalogAdapter';
import type { AdminSortDirection } from '@/lib/services/admin/types';

export type ProductStatus = CatalogProductRow['status'];

export type ProductCreateInput = {
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  discountLabel: string | null;
  referencePrice: number | null;
  installmentCount: number | null;
  installmentAmount: number | null;
  stock: number;
  status: ProductStatus;
  featured: boolean;
  imageUrl: string | null;
  carouselImages: string[];
};

export type ProductUpdateInput = Partial<ProductCreateInput>;

export type ProductListSortKey = 'name' | 'category' | 'price' | 'stock' | 'status' | 'createdAt';

export type ProductListFilters = {
  search: string;
  status: ProductStatus | 'all';
  featured: 'all' | 'featured' | 'not-featured';
  categoryId: string;
  searchCategoryIds?: string[];
};

export type PaginatedProductsInput = {
  page: number;
  limit: number;
  filters: ProductListFilters;
  sorting: {
    sortKey: ProductListSortKey;
    direction: AdminSortDirection;
  };
};

export type PaginatedProductsResult = {
  products: CatalogProductRow[];
  total: number;
};

const productColumns = `
  id,
  legacy_product_id,
  category_id,
  name,
  slug,
  description,
  price,
  compare_at_price,
  discount_label,
  reference_price,
  stock,
  status,
  featured,
  image_url,
  carousel_images,
  specifications,
  features,
  created_at,
  categories:category_id (name, slug)
`;

function productsQuery(supabase: SupabaseClient) {
  return supabase
    .from('products')
    .select(productColumns)
    .order('created_at', { ascending: false });
}

function activeProductsQuery(supabase: SupabaseClient) {
  return supabase
    .from('products')
    .select(productColumns)
    .eq('status', 'ACTIVE')
    .order('featured', { ascending: false })
    .order('name', { ascending: true });
}

function getProductOrderColumn(sortKey: ProductListSortKey): string {
  if (sortKey === 'price') return 'price';
  if (sortKey === 'stock') return 'stock';
  if (sortKey === 'status') return 'status';
  if (sortKey === 'category') return 'category_id';
  if (sortKey === 'createdAt') return 'created_at';
  return 'name';
}

export async function listProducts(supabase: SupabaseClient): Promise<CatalogProductRow[]> {
  const { data, error } = await activeProductsQuery(supabase);

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CatalogProductRow[];
}

export async function listAllProducts(supabase: SupabaseClient): Promise<CatalogProductRow[]> {
  const { data, error } = await productsQuery(supabase);

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CatalogProductRow[];
}

export async function listProductsPaginated(
  supabase: SupabaseClient,
  input: PaginatedProductsInput
): Promise<PaginatedProductsResult> {
  const from = (input.page - 1) * input.limit;
  const to = from + input.limit - 1;
  let query = supabase
    .from('products')
    .select(productColumns, { count: 'exact' });

  if (input.filters.status !== 'all') {
    query = query.eq('status', input.filters.status);
  }

  if (input.filters.featured === 'featured') {
    query = query.eq('featured', true);
  }

  if (input.filters.featured === 'not-featured') {
    query = query.eq('featured', false);
  }

  if (input.filters.categoryId) {
    query = query.eq('category_id', input.filters.categoryId);
  }

  if (input.filters.search) {
    const search = input.filters.search.replaceAll('%', '').replaceAll(',', ' ').trim();
    if (search) {
      const categoryFilter = input.filters.searchCategoryIds?.length
        ? `,category_id.in.(${input.filters.searchCategoryIds.join(',')})`
        : '';
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%${categoryFilter}`);
    }
  }

  query = query
    .order(getProductOrderColumn(input.sorting.sortKey), { ascending: input.sorting.direction === 'asc' })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    products: (data ?? []) as unknown as CatalogProductRow[],
    total: count ?? 0,
  };
}

export async function createProduct(
  supabase: SupabaseClient,
  input: ProductCreateInput
): Promise<CatalogProductRow> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      category_id: input.categoryId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      price: input.price,
      compare_at_price: input.compareAtPrice,
      discount_label: input.discountLabel,
      reference_price: input.referencePrice,
      stock: input.stock,
      status: input.status,
      featured: input.featured,
      image_url: input.imageUrl,
      carousel_images: input.carouselImages,
      specifications: {},
      features: [],
    })
    .select(productColumns)
    .single();

  if (error) {
    throw error;
  }

  return data as unknown as CatalogProductRow;
}

export async function updateProduct(
  supabase: SupabaseClient,
  productId: string,
  input: ProductUpdateInput
): Promise<CatalogProductRow> {
  const payload: Record<string, string | number | boolean | string[] | null> = {};

  if (input.categoryId !== undefined) payload.category_id = input.categoryId;
  if (input.name !== undefined) payload.name = input.name;
  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.description !== undefined) payload.description = input.description;
  if (input.price !== undefined) payload.price = input.price;
  if (input.compareAtPrice !== undefined) payload.compare_at_price = input.compareAtPrice;
  if (input.discountLabel !== undefined) payload.discount_label = input.discountLabel;
  if (input.referencePrice !== undefined) payload.reference_price = input.referencePrice;
  if (input.stock !== undefined) payload.stock = input.stock;
  if (input.status !== undefined) payload.status = input.status;
  if (input.featured !== undefined) payload.featured = input.featured;
  if (input.imageUrl !== undefined) payload.image_url = input.imageUrl;
  if (input.carouselImages !== undefined) payload.carousel_images = input.carouselImages;

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', productId)
    .select(productColumns)
    .single();

  if (error) {
    throw error;
  }

  return data as unknown as CatalogProductRow;
}

export async function getProductBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<CatalogProductRow | null> {
  const { data, error } = await activeProductsQuery(supabase)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as CatalogProductRow | null;
}

export async function getProductById(
  supabase: SupabaseClient,
  productId: string
): Promise<CatalogProductRow | null> {
  const { data, error } = await productsQuery(supabase)
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as CatalogProductRow | null;
}

export async function getProductByLegacyId(
  supabase: SupabaseClient,
  legacyProductId: number
): Promise<CatalogProductRow | null> {
  const { data, error } = await activeProductsQuery(supabase)
    .eq('legacy_product_id', legacyProductId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as CatalogProductRow | null;
}

function normalizeStr(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export async function listProductsByCategory(
  supabase: SupabaseClient,
  categoryName: string
): Promise<CatalogProductRow[]> {
  const products = await listProducts(supabase);
  const normalizedInput = normalizeStr(categoryName);

  return products.filter(
    (product) => {
      const category = Array.isArray(product.categories) ? product.categories[0] : product.categories;
      const name = category?.name ?? '';
      return normalizeStr(name) === normalizedInput;
    }
  );
}

export async function listFeaturedProducts(supabase: SupabaseClient): Promise<CatalogProductRow[]> {
  const { data, error } = await activeProductsQuery(supabase).eq('featured', true);

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CatalogProductRow[];
}

export async function deleteProduct(
  supabase: SupabaseClient,
  productId: string
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    throw error;
  }
}
