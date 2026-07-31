import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogProductRow } from '@/lib/adapters/catalogAdapter';
import type { CatalogCategoryRow } from '@/lib/adapters/catalogAdapter';
import type { AdminSortDirection } from '@/lib/services/admin/types';
import { getSizeAliases } from '@/lib/sizeUtils';
import { normalizeCategory } from '@/lib/categoryUtils';
import { listActiveCategories } from '@/lib/repositories/categoryRepository';

export type ProductStatus = CatalogProductRow['status'];

export type ProductCreateInput = {
  categoryId: string | null;
  categoryIds: string[];
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
  tendencias: boolean;
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
  size: string;
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
  tendencias,
  image_url,
  carousel_images,
  specifications,
  features,
  created_at,
  deleted_at,
  deleted_by,
  delete_reason,
  categories:category_id (name, slug),
  product_categories!left (
    category_id,
    category:category_id (id, name, slug)
  )
`;

const publicProductColumns = `
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
  tendencias,
  image_url,
  carousel_images,
  specifications,
  features,
  created_at,
  deleted_at,
  deleted_by,
  delete_reason,
  categories:category_id (name, slug),
  product_categories!left (
    category_id,
    category:category_id (id, name, slug)
  )
`;

function productsQuery(supabase: SupabaseClient) {
  return supabase
    .from('products')
    .select(productColumns)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
}

function activeProductsQuery(supabase: SupabaseClient) {
  return supabase
    .from('products')
    .select(productColumns)
    .eq('status', 'ACTIVE')
    .is('deleted_at', null)
    .order('featured', { ascending: false })
    .order('name', { ascending: true });
}

function trashedProductsQuery(supabase: SupabaseClient) {
  return supabase
    .from('products')
    .select(productColumns)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
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
  let query = supabase
    .from('products')
    .select(productColumns, { count: 'exact' })
    .is('deleted_at', null);

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

  if (input.filters.size) {
    const sizeQuery = input.filters.size.replaceAll('%', '').trim();
    if (sizeQuery) {
      const aliases = getSizeAliases(sizeQuery);
      const nameConditions = aliases.map(a => `name.ilike.%${a}%`).join(',');
      const specConditions = aliases.map(a => `specifications->>size.ilike.${a}`).join(',');
      const combined = [specConditions, nameConditions].filter(Boolean).join(',');
      if (combined) {
        query = query.or(combined);
      }
    }
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
    .order(getProductOrderColumn(input.sorting.sortKey), { ascending: input.sorting.direction === 'asc' });

  if (input.limit !== -1) {
    const from = (input.page - 1) * input.limit;
    const to = from + input.limit - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    products: (data ?? []) as unknown as CatalogProductRow[],
    total: count ?? 0,
  };
}

async function setProductCategories(
  supabase: SupabaseClient,
  productId: string,
  categoryIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('product_categories')
    .delete()
    .eq('product_id', productId);

  if (deleteError) throw deleteError;

  if (categoryIds.length === 0) return;

  const rows = categoryIds.map(categoryId => ({
    product_id: productId,
    category_id: categoryId,
  }));

  const { error: insertError } = await supabase
    .from('product_categories')
    .insert(rows);

  if (insertError) throw insertError;
}

export async function createProduct(
  supabase: SupabaseClient,
  input: ProductCreateInput
): Promise<CatalogProductRow> {
  const newSpecs: Record<string, unknown> = {};
  if (input.installmentCount !== null) newSpecs.installment_count = input.installmentCount;
  if (input.installmentAmount !== null) newSpecs.installment_amount = input.installmentAmount;

  const { data, error } = await supabase
    .from('products')
    .insert({
      category_id: input.categoryId ?? input.categoryIds[0] ?? null,
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
      tendencias: input.tendencias,
      image_url: input.imageUrl,
      carousel_images: input.carouselImages,
      specifications: newSpecs,
      features: [],
    })
    .select(productColumns)
    .single();

  if (error) {
    throw error;
  }

  const product = data as unknown as CatalogProductRow;

  if (input.categoryIds.length > 0) {
    await setProductCategories(supabase, product.id, input.categoryIds);
  }

  return product;
}

export async function updateProduct(
  supabase: SupabaseClient,
  productId: string,
  input: ProductUpdateInput
): Promise<CatalogProductRow> {
  const hasInstallment = input.installmentCount !== undefined || input.installmentAmount !== undefined;

  let specs: Record<string, unknown> | undefined;
  if (hasInstallment) {
    const current = await getProductById(supabase, productId);
    specs = (current?.specifications as Record<string, unknown>) ?? {};
    if (input.installmentCount !== undefined) specs.installment_count = input.installmentCount;
    if (input.installmentAmount !== undefined) specs.installment_amount = input.installmentAmount;
  }

  const payload: Record<string, unknown> = {};

  if (input.categoryId !== undefined) payload.category_id = input.categoryId;
  if (input.categoryIds !== undefined) payload.category_id = input.categoryIds[0] ?? null;
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
  if (input.tendencias !== undefined) payload.tendencias = input.tendencias;
  if (input.imageUrl !== undefined) payload.image_url = input.imageUrl;
  if (input.carouselImages !== undefined) payload.carousel_images = input.carouselImages;
  if (specs) payload.specifications = specs;

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', productId)
    .is('deleted_at', null)
    .select(productColumns)
    .single();

  if (error) {
    throw error;
  }

  const product = data as unknown as CatalogProductRow;

  if (input.categoryIds !== undefined) {
    await setProductCategories(supabase, productId, input.categoryIds);
  }

  return product;
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

function collectDescendantIds(
  categories: CatalogCategoryRow[],
  parentId: string
): Set<string> {
  const ids = new Set<string>([parentId]);
  for (const cat of categories) {
    if (cat.parent_id === parentId) {
      const childIds = collectDescendantIds(categories, cat.id);
      childIds.forEach(id => ids.add(id));
    }
  }
  return ids;
}

export async function listProductsByCategory(
  supabase: SupabaseClient,
  categoryName: string
): Promise<CatalogProductRow[]> {
  const allCategories = await listActiveCategories(supabase);

  const normalizedInput = normalizeCategory(categoryName);

  const slugTarget = allCategories.find(
    c => normalizeCategory(c.slug ?? '') === normalizedInput
  );
  const target = slugTarget ?? allCategories.find(
    c => normalizeCategory(c.name) === normalizedInput
  );

  if (!target) return [];

  const categoryIds = [...collectDescendantIds(allCategories, target.id)];

  const { data: primaryData, error: primaryError } = await supabase
    .from('products')
    .select(publicProductColumns)
    .eq('status', 'ACTIVE')
    .is('deleted_at', null)
    .in('category_id', categoryIds)
    .order('featured', { ascending: false })
    .order('name', { ascending: true });

  if (primaryError) throw primaryError;
  const primary = (primaryData ?? []) as unknown as CatalogProductRow[];

  const { data: secondaryLinks } = await supabase
    .from('product_categories')
    .select('product_id')
    .in('category_id', categoryIds);

  const secondaryProductIds = [...new Set((secondaryLinks ?? []).map(j => j.product_id))];

  let secondary: CatalogProductRow[] = [];
  if (secondaryProductIds.length > 0) {
    const { data: secondaryData, error: secondaryError } = await supabase
      .from('products')
      .select(publicProductColumns)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .in('id', secondaryProductIds)
      .order('featured', { ascending: false })
      .order('name', { ascending: true });

    if (secondaryError) throw secondaryError;
    secondary = (secondaryData ?? []) as unknown as CatalogProductRow[];
  }

  const seen = new Set<string>();
  const merged: CatalogProductRow[] = [];
  for (const row of [...primary, ...secondary]) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      merged.push(row);
    }
  }

  return merged;
}

export async function listFeaturedProducts(supabase: SupabaseClient): Promise<CatalogProductRow[]> {
  const { data, error } = await activeProductsQuery(supabase).eq('featured', true);

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CatalogProductRow[];
}

export async function moveProductToTrash(
  supabase: SupabaseClient,
  productId: string,
  deletedBy: string | null,
  deleteReason?: string | null
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
      delete_reason: deleteReason || null,
    })
    .eq('id', productId)
    .is('deleted_at', null);

  if (error) {
    throw error;
  }
}

export async function restoreProduct(
  supabase: SupabaseClient,
  productId: string
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      deleted_at: null,
      deleted_by: null,
      delete_reason: null,
    })
    .eq('id', productId)
    .not('deleted_at', 'is', null);

  if (error) {
    throw error;
  }
}

export async function hardDeleteProduct(
  supabase: SupabaseClient,
  productId: string
): Promise<void> {
  const { error: junctionError } = await supabase
    .from('product_categories')
    .delete()
    .eq('product_id', productId);

  if (junctionError) throw junctionError;

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    throw error;
  }
}

export async function listTrashedProducts(supabase: SupabaseClient): Promise<CatalogProductRow[]> {
  const { data, error } = await trashedProductsQuery(supabase);

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CatalogProductRow[];
}

export async function countTrashedProducts(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .not('deleted_at', 'is', null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getTrashedProductById(
  supabase: SupabaseClient,
  productId: string
): Promise<CatalogProductRow | null> {
  const { data, error } = await trashedProductsQuery(supabase)
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as CatalogProductRow | null;
}

export type ProductReferenceCounts = {
  saleItems: number;
  creditItems: number;
};

export async function countProductReferences(
  supabase: SupabaseClient,
  productId: string,
  productName: string
): Promise<ProductReferenceCounts> {
  const { count: saleItems, error: saleError } = await supabase
    .from('sale_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);

  if (saleError) throw saleError;

  const { count: creditItems, error: creditError } = await supabase
    .from('credit_account_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_name', productName);

  if (creditError) throw creditError;

  return {
    saleItems: saleItems ?? 0,
    creditItems: creditItems ?? 0,
  };
}


