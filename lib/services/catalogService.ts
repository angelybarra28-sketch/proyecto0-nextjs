import { adaptCatalogProduct } from '@/lib/adapters/catalogAdapter';
import { allProducts, productData } from '@/lib/products';
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

function getLocalProducts(): Product[] {
  return allProducts;
}

function hasSupabaseData(products: Product[]): boolean {
  return products.length > 0;
}

async function safelyLoadSupabaseProducts(loader: () => Promise<Product[]>): Promise<Product[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  try {
    return await loader();
  } catch (error) {
    console.error('Error loading catalog from Supabase:', error);
    return [];
  }
}

async function hasSupabaseCatalogRows(): Promise<boolean> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return false;
  }

  try {
    const products = await listAllProducts(supabase);
    return products.length > 0;
  } catch (error) {
    console.error('Error checking Supabase catalog fallback:', error);
    return false;
  }
}

export async function getProducts(): Promise<Product[]> {
  const supabaseProducts = await safelyLoadSupabaseProducts(async () => {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];
    const rows = await listProducts(supabase);
    return rows.map(adaptCatalogProduct);
  });

  return hasSupabaseData(supabaseProducts) ? supabaseProducts : getLocalProducts();
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const supabaseProducts = await safelyLoadSupabaseProducts(async () => {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];
    const row = await getSupabaseProductBySlug(supabase, slug);
    return row ? [adaptCatalogProduct(row)] : [];
  });

  if (supabaseProducts[0]) return supabaseProducts[0];

  return await hasSupabaseCatalogRows() ? undefined : allProducts.find((product) => product.slug === slug);
}

export async function getProductByLegacyId(legacyProductId: number): Promise<Product | undefined> {
  const supabaseProducts = await safelyLoadSupabaseProducts(async () => {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];
    const row = await getSupabaseProductByLegacyId(supabase, legacyProductId);
    return row ? [adaptCatalogProduct(row)] : [];
  });

  if (supabaseProducts[0]) return supabaseProducts[0];

  return await hasSupabaseCatalogRows() ? undefined : allProducts.find((product) => product.id === legacyProductId);
}

export async function getProductsByCategory(categoria: string): Promise<Product[]> {
  const supabaseProducts = await safelyLoadSupabaseProducts(async () => {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];
    const rows = await listProductsByCategory(supabase, categoria);
    return rows.map(adaptCatalogProduct);
  });

  if (hasSupabaseData(supabaseProducts)) return supabaseProducts;

  return await hasSupabaseCatalogRows()
    ? []
    : allProducts.filter((product) => product.categoria.toLowerCase() === categoria.toLowerCase());
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const supabaseProducts = await safelyLoadSupabaseProducts(async () => {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];
    const rows = await listFeaturedProducts(supabase);
    return rows.map(adaptCatalogProduct);
  });

  return hasSupabaseData(supabaseProducts)
    ? supabaseProducts
    : allProducts.filter((product) => product.destacado);
}

export async function getCatalogCategories(): Promise<string[]> {
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    try {
      const categories = await listActiveCategories(supabase);
      if (categories.length > 0) {
        return categories.map((category) => category.name);
      }
    } catch (error) {
      console.error('Error loading categories from Supabase:', error);
    }
  }

  return Array.from(new Set(allProducts.map((product) => product.categoria)));
}

export async function getProductSections(): Promise<{ section1: ProductSection; section2: ProductSection }> {
  const products = await getProducts();

  if (products === allProducts) {
    return productData;
  }

  const featured = products.filter((product) => product.destacado);
  const regular = products.filter((product) => !product.destacado);

  return {
    section1: {
      title: productData.section1.title,
      products: featured.length > 0 ? featured : products.slice(0, 6),
    },
    section2: {
      title: productData.section2.title,
      products: regular.length > 0 ? regular : products.slice(6),
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
