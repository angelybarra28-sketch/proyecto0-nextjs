import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogProductRow } from '@/lib/adapters/catalogAdapter';

export type ProductStatus = CatalogProductRow['status'];

export type ProductCreateInput = {
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  discountLabel: string | null;
  stock: number;
  status: ProductStatus;
  featured: boolean;
  imageUrl: string | null;
  carouselImages: string[];
};

export type ProductUpdateInput = Partial<ProductCreateInput>;

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

export async function listProductsByCategory(
  supabase: SupabaseClient,
  categoryName: string
): Promise<CatalogProductRow[]> {
  const products = await listProducts(supabase);

  return products.filter(
    (product) => {
      const category = Array.isArray(product.categories) ? product.categories[0] : product.categories;
      return category?.name.toLowerCase() === categoryName.toLowerCase();
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
