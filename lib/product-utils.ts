import { allProducts } from './products';

export type Product = typeof allProducts[0];

/**
 * Busca un producto por su slug
 * @param slug - El slug SEO del producto
 * @returns El producto encontrado o undefined
 */
export function getProductBySlug(slug: string): Product | undefined {
  return allProducts.find(p => p.slug === slug);
}

/**
 * Busca un producto por su ID (para compatibilidad futura)
 * @param id - El ID del producto
 * @returns El producto encontrado o undefined
 */
export function getProductById(id: number): Product | undefined {
  return allProducts.find(p => p.id === id);
}

/**
 * Obtiene todos los productos de una categoría
 * @param categoria - El nombre de la categoría
 * @returns Array de productos en esa categoría
 */
export function getProductsByCategory(categoria: string): Product[] {
  return allProducts.filter(
    p => p.categoria.toLowerCase() === categoria.toLowerCase()
  );
}

/**
 * Obtiene productos relacionados (misma categoría, excluyendo el actual)
 * @param productSlug - El slug del producto actual
 * @param limit - Cantidad máxima de productos relacionados a retornar
 * @returns Array de productos relacionados
 */
export function getRelatedProducts(productSlug: string, limit = 4): Product[] {
  const currentProduct = getProductBySlug(productSlug);
  
  if (!currentProduct) return [];
  
  return allProducts
    .filter(p => 
      p.categoria === currentProduct.categoria && 
      p.slug !== productSlug
    )
    .slice(0, limit);
}

/**
 * Obtiene todos los slugs de productos (útil para generateStaticParams)
 * @returns Array de objetos con el slug de cada producto
 */
export function getAllProductSlugs() {
  return allProducts.map(product => ({
    slug: product.slug
  }));
}

/**
 * Obtiene todos los productos destacados
 * @returns Array de productos destacados
 */
export function getFeaturedProducts(): Product[] {
  return allProducts.filter(p => p.destacado);
}
