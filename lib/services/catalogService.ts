import { adaptCatalogProduct } from '@/lib/adapters/catalogAdapter';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { Product, ProductSection } from '@/lib/types';
import {
  getProductByLegacyId as getSupabaseProductByLegacyId,
  getProductBySlug as getSupabaseProductBySlug,
  listAllProducts,
  listFeaturedProducts,
  listProducts,
  listProductsByCategory,
} from '@/lib/repositories/productRepository';
import { listActiveCategories } from '@/lib/repositories/categoryRepository';

async function safelyLoadSupabaseProducts(loader: () => Promise<Product[]>): Promise<Product[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];
  try {
    return await loader();
  } catch (error) {
    console.error('Error loading catalog from Supabase:', error);
    return [];
  }
}

export async function getProducts(): Promise<Product[]> {
  return safelyLoadSupabaseProducts(async () => {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];
    const rows = await listProducts(supabase);
    return rows.map(adaptCatalogProduct);
  });
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await safelyLoadSupabaseProducts(async () => {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];
    const row = await getSupabaseProductBySlug(supabase, slug);
    return row ? [adaptCatalogProduct(row)] : [];
  });
  return products[0];
}

export async function getProductByLegacyId(legacyProductId: number): Promise<Product | undefined> {
  const products = await safelyLoadSupabaseProducts(async () => {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];
    const row = await getSupabaseProductByLegacyId(supabase, legacyProductId);
    return row ? [adaptCatalogProduct(row)] : [];
  });
  return products[0];
}

export async function getProductsByCategory(categoria: string): Promise<Product[]> {
  return safelyLoadSupabaseProducts(async () => {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];
    const rows = await listProductsByCategory(supabase, categoria);
    return rows.map(adaptCatalogProduct);
  });
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return safelyLoadSupabaseProducts(async () => {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];
    const rows = await listFeaturedProducts(supabase);
    return rows.map(adaptCatalogProduct);
  });
}

export async function getCatalogCategories(): Promise<string[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];
  try {
    const categories = await listActiveCategories(supabase);
    if (categories.length === 0) return [];
    const slugs = categories.map((category) => {
      if (category.slug === 'toallones') return 'toallas';
      return category.slug;
    });
    if (!slugs.includes('invierno-abrigo')) slugs.push('invierno-abrigo');
    return slugs;
  } catch (error) {
    console.error('Error loading categories from Supabase:', error);
    return [];
  }
}

export async function getProductSections(): Promise<{ section1: ProductSection; section2: ProductSection }> {
  const products = await getProducts();
  const featured = products.filter((product) => product.destacado);
  const tendencias = products.filter((product) => product.tendencias);

  return {
    section1: {
      title: 'Articulos mas elegidos',
      products: featured.length > 0 ? featured : products.slice(0, 6),
    },
    section2: {
      title: 'Tendencias',
      products: tendencias.length > 0 ? tendencias : products.filter((p) => !p.destacado).slice(0, 6),
    },
  };
}

export async function getAllProductSlugs(): Promise<Array<{ slug: string }>> {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function getAllLegacyProductIds(): Promise<Array<{ id: string }>> {
  const products = await getProducts();
  return products
    .filter((product) => product.id > 0)
    .map((product) => ({ id: product.id.toString() }));
}
