import { allProducts } from './products';
import type { ProductFilters, FilterOptions, ProductStats, FilteredProductsResult } from './types';
import type { Product } from './types';
import { normalizeSize, getSizeAliases } from './sizeUtils';
import { normalizeCategory } from './categoryUtils';

export type { Product };

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
 * Obtiene todos los productos de una categorÃ­a
 * @param categoria - El nombre de la categorÃ­a
 * @returns Array de productos en esa categorÃ­a
 */
export function getProductsByCategory(categoria: string): Product[] {
  const normalized = normalizeCategory(categoria);
  return allProducts.filter(
    p => normalizeCategory(p.categoria) === normalized
  );
}

/**
 * Obtiene productos relacionados (misma categorÃ­a, excluyendo el actual)
 * @param productSlug - El slug del producto actual
 * @param limit - Cantidad mÃ¡xima de productos relacionados a retornar
 * @returns Array de productos relacionados
 */
export function getRelatedProducts(productSlug: string, limit = 4): Product[] {
  const currentProduct = getProductBySlug(productSlug);

  if (!currentProduct) return [];

  return allProducts
    .filter(p =>
      normalizeCategory(p.categoria) === normalizeCategory(currentProduct.categoria) &&
      p.slug !== productSlug
    )
    .slice(0, limit);
}

/**
 * Obtiene todos los slugs de productos (Ãºtil para generateStaticParams)
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

// ========================================
// SISTEMA PROFESIONAL DE FILTROS
// ========================================

/**
 * Obtiene productos con descuento
 * @param products - Array de productos a filtrar
 * @returns Array de productos con descuento
 */
export function getDiscountedProducts(products: Product[]): Product[] {
  return products.filter(p => p.discount && p.discount.trim() !== '');
}

/**
 * Obtiene productos disponibles en stock
 * @param products - Array de productos a filtrar
 * @returns Array de productos con stock > 0
 */
export function getAvailableProducts(products: Product[]): Product[] {
  return products.filter(p => p.stock > 0);
}

/**
 * Obtiene productos dentro de un rango de precio
 * @param products - Array de productos
 * @param minPrice - Precio mÃ­nimo (incluido)
 * @param maxPrice - Precio mÃ¡ximo (incluido)
 * @returns Array de productos en el rango
 */
export function getProductsByPriceRange(
  products: Product[],
  minPrice: number,
  maxPrice: number
): Product[] {
  return products.filter(
    p => p.priceNumber >= minPrice && p.priceNumber <= maxPrice
  );
}

/**
 * Normaliza una cadena de texto eliminando acentos, diacrÃ­ticos y espacios innecesarios
 * y convirtiendo a minÃºsculas para bÃºsquedas case-insensitive precisas.
 * @param text - El texto a normalizar
 * @returns El texto normalizado
 */
export function normalizeSearch(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Busca productos de manera case-insensitive sobre campos mÃºltiples:
 * name, category (categoria), tags, features y shortDescription.
 * @param products - Array de productos
 * @param query - TÃ©rmino de bÃºsqueda
 * @returns Array de productos que coinciden con la bÃºsqueda
 */
export function searchProducts(products: Product[], query: string): Product[] {
  if (!query || query.trim() === '') return products;

  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return products;

  return products.filter(p => {
    // Tipado dinÃ¡mico para acceder a campos opcionales/futuros sin romper tipos existentes
    const item = p as {
      name?: string;
      categoria?: string;
      category?: string;
      tags?: string[] | string;
      features?: string[] | string;
      shortDescription?: string;
      description?: string;
    };

    // 1. name
    const nameMatch = item.name ? normalizeSearch(item.name).includes(normalizedQuery) : false;

    // 2. category (soporta 'categoria' y 'category')
    const categoryMatch = (item.categoria && normalizeSearch(item.categoria).includes(normalizedQuery)) ||
      (item.category && normalizeSearch(item.category).includes(normalizedQuery));

    // 3. tags (soporta string[] o string simple)
    let tagsMatch = false;
    if (item.tags) {
      if (Array.isArray(item.tags)) {
        tagsMatch = item.tags.some(tag => tag && normalizeSearch(tag).includes(normalizedQuery));
      } else if (typeof item.tags === 'string') {
        tagsMatch = normalizeSearch(item.tags).includes(normalizedQuery);
      }
    }

    // 4. features (soporta string[] o string simple)
    let featuresMatch = false;
    if (item.features) {
      if (Array.isArray(item.features)) {
        featuresMatch = item.features.some(feature => feature && normalizeSearch(feature).includes(normalizedQuery));
      } else if (typeof item.features === 'string') {
        featuresMatch = normalizeSearch(item.features).includes(normalizedQuery);
      }
    }

    // 5. shortDescription (tambiÃ©n evalÃºa description por compatibilidad y robustez)
    const shortDescMatch = item.shortDescription ? normalizeSearch(item.shortDescription).includes(normalizedQuery) : false;
    const descMatch = item.description ? normalizeSearch(item.description).includes(normalizedQuery) : false;

    return nameMatch || categoryMatch || tagsMatch || featuresMatch || shortDescMatch || descMatch;
  });
}

/**
 * Obtiene estadÃ­sticas de productos para UI de filtros
 * @param products - Array de productos a analizar
 * @returns EstadÃ­sticas completas
 */
export function getProductStats(products: Product[]): ProductStats {
  const categoriesCount = new Map<string, number>();
  const tagFrequency = new Map<string, number>();
  let minPrice = Infinity;
  let maxPrice = 0;
  let discountedCount = 0;
  let availableCount = 0;
  let totalPrice = 0;

  products.forEach(p => {
    // Contar categorÃ­as
    const catCount = categoriesCount.get(p.categoria) || 0;
    categoriesCount.set(p.categoria, catCount + 1);

    // Actualizar rango de precios
    minPrice = Math.min(minPrice, p.priceNumber);
    maxPrice = Math.max(maxPrice, p.priceNumber);
    totalPrice += p.priceNumber;

    // Contar descuentos
    if (p.discount) discountedCount++;

    // Contar disponibles
    if (p.stock > 0) availableCount++;
  });

  return {
    totalProducts: products.length,
    categoriesCount,
    priceRange: {
      min: minPrice === Infinity ? 0 : minPrice,
      max: maxPrice || 0
    },
    discountedCount,
    availableCount,
    averagePrice: products.length > 0 ? Math.round(totalPrice / products.length) : 0,
    tagFrequency
  };
}

/**
 * Obtiene opciones de filtros disponibles basadas en productos
 * Ãštil para renderizar UI de filtros (dropdowns, checkboxes, etc)
 * @param products - Array de productos a analizar
 * @returns Opciones de filtros agrupadas
 */
export function getFilterOptions(products: Product[]): FilterOptions {
  const stats = getProductStats(products);

  // Agrupar categorÃ­as con conteo
  const categories = Array.from(stats.categoriesCount.entries()).map(
    ([name, count]) => ({ name, count })
  ).sort((a, b) => b.count - a.count);

  // Obtener porcentajes de descuento Ãºnicos
  const discountSet = new Set<number>();
  products.forEach(p => {
    if (p.discount) {
      const percentage = parseInt(p.discount.match(/\d+/)?.[0] || '0', 10);
      if (percentage > 0) discountSet.add(percentage);
    }
  });
  const discountPercentages = Array.from(discountSet).sort((a, b) => b - a);

  return {
    categories,
    priceRange: {
      min: stats.priceRange.min,
      max: stats.priceRange.max,
      step: 1000 // Para sliders
    },
    discountPercentages,
    tags: [], // Preparado para futuro cuando haya tags
    totalProducts: products.length,
    filteredProducts: products.length
  };
}

/**
 * FUNCIÃ“N PRINCIPAL: Aplica mÃºltiples filtros a un array de productos
 * Soporta combinaciones complejas de filtros
 * @param products - Array de productos a filtrar
 * @param filters - Objeto con filtros a aplicar
 * @returns Array de productos que cumplen TODOS los filtros
 *
 * EJEMPLO DE USO:
 * const filteredProducts = filterProducts(allProducts, {
 *   categoria: 'blanquerÃ­a',
 *   maxPrice: 20000,
 *   inStock: true,
 *   discountOnly: false
 * });
 */
export function filterProducts(
  products: Product[],
  filters: ProductFilters
): Product[] {
  let result = [...products];

  // Filtro por tamaÃ±o
  if (filters.size) {
    const aliases = getSizeAliases(filters.size).map(a => a.toLowerCase());
    result = result.filter(p => {
      const productSize = p.specifications?.size;
      if (productSize && aliases.includes(normalizeSize(productSize))) return true;
      return aliases.some(a => p.name.toLowerCase().includes(a));
    });
  }

  // Filtro por bÃºsqueda
  if (filters.searchQuery) {
    result = searchProducts(result, filters.searchQuery);
  }

  // Filtro por categorÃ­a
  if (filters.categoria) {
    const normalized = normalizeCategory(filters.categoria);
    result = result.filter(
      p => normalizeCategory(p.categoria) === normalized
    );
  }

  // Filtro por rango de precio
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const minPrice = filters.minPrice ?? 0;
    const maxPrice = filters.maxPrice ?? Infinity;
    result = result.filter(
      p => p.priceNumber >= minPrice && p.priceNumber <= maxPrice
    );
  }

  // Filtro por stock disponible
  if (filters.inStock === true) {
    result = result.filter(p => p.stock > 0);
  }

  // Filtro por descuento
  if (filters.discountOnly === true) {
    result = result.filter(p => p.discount && p.discount.trim() !== '');
  }

  // Filtro por tags (preparado para futuro)
  if (filters.tags && filters.tags.length > 0) {
    result = result.filter(p =>
      filters.tags!.some(tag =>
        p.name.toLowerCase().includes(tag.toLowerCase())
      )
    );
  }

  // Ordenamiento
  if (filters.sortBy) {
    result = sortProducts(result, filters.sortBy);
  }

  return result;
}

/**
 * Ordena productos segÃºn criterio especificado
 * @param products - Array de productos
 * @param sortBy - Criterio de ordenamiento
 * @returns Array ordenado
 */
export function sortProducts(
  products: Product[],
  sortBy: 'price-asc' | 'price-desc' | 'newest' | 'popularity'
): Product[] {
  const sorted = [...products];

  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => a.priceNumber - b.priceNumber);

    case 'price-desc':
      return sorted.sort((a, b) => b.priceNumber - a.priceNumber);

    case 'newest':
      // Asumir que ID mÃ¡s alto = mÃ¡s nuevo (por consistencia con datos)
      return sorted.sort((a, b) => b.id - a.id);

    case 'popularity':
      // Asumir que destacado = mÃ¡s popular
      return sorted.sort((a, b) => {
        if (a.destacado === b.destacado) return 0;
        return a.destacado ? -1 : 1;
      });

    default:
      return sorted;
  }
}

/**
 * Aplica filtros y retorna resultado completo con opciones actualizadas
 * FUNCIÃ“N PARA UI AVANZADA: Ãštil para components que necesitan actualizar
 * los filtros disponibles despuÃ©s de aplicar filtros
 * @param products - Array de productos
 * @param filters - Filtros a aplicar
 * @returns Resultado con productos filtrados y opciones actualizadas
 */
export function applyFiltersWithOptions(
  products: Product[],
  filters: ProductFilters
): FilteredProductsResult {
  const filtered = filterProducts(products, filters);
  const options = getFilterOptions(filtered);

  return {
    products: filtered,
    total: filtered.length,
    filters,
    options
  };
}

/**
 * PaginaciÃ³n simple de productos
 * @param products - Array de productos
 * @param page - NÃºmero de pÃ¡gina (1-indexed)
 * @param itemsPerPage - Items por pÃ¡gina
 * @returns Productos de la pÃ¡gina especificada
 */
export function paginateProducts(
  products: Product[],
  page: number = 1,
  itemsPerPage: number = 12
): Product[] {
  const startIndex = (page - 1) * itemsPerPage;
  return products.slice(startIndex, startIndex + itemsPerPage);
}

/**
 * Obtiene informaciÃ³n de paginaciÃ³n
 * @param total - Total de items
 * @param itemsPerPage - Items por pÃ¡gina
 * @returns Objeto con info de paginaciÃ³n
 */
export function getPaginationInfo(total: number, itemsPerPage: number = 12) {
  return {
    totalPages: Math.ceil(total / itemsPerPage),
    totalItems: total,
    itemsPerPage
  };
}






