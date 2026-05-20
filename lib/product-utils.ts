import { allProducts } from './products';
import type { ProductFilters, FilterOptions, ProductStats, FilteredProductsResult } from './types';

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
 * @param minPrice - Precio mínimo (incluido)
 * @param maxPrice - Precio máximo (incluido)
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
 * Normaliza una cadena de texto eliminando acentos, diacríticos y espacios innecesarios
 * y convirtiendo a minúsculas para búsquedas case-insensitive precisas.
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
 * Busca productos de manera case-insensitive sobre campos múltiples:
 * name, category (categoria), tags, features y shortDescription.
 * @param products - Array de productos
 * @param query - Término de búsqueda
 * @returns Array de productos que coinciden con la búsqueda
 */
export function searchProducts(products: Product[], query: string): Product[] {
  if (!query || query.trim() === '') return products;
  
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return products;

  return products.filter(p => {
    // Tipado dinámico para acceder a campos opcionales/futuros sin romper tipos existentes
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

    // 5. shortDescription (también evalúa description por compatibilidad y robustez)
    const shortDescMatch = item.shortDescription ? normalizeSearch(item.shortDescription).includes(normalizedQuery) : false;
    const descMatch = item.description ? normalizeSearch(item.description).includes(normalizedQuery) : false;

    return nameMatch || categoryMatch || tagsMatch || featuresMatch || shortDescMatch || descMatch;
  });
}

/**
 * Obtiene estadísticas de productos para UI de filtros
 * @param products - Array de productos a analizar
 * @returns Estadísticas completas
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
    // Contar categorías
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
 * Útil para renderizar UI de filtros (dropdowns, checkboxes, etc)
 * @param products - Array de productos a analizar
 * @returns Opciones de filtros agrupadas
 */
export function getFilterOptions(products: Product[]): FilterOptions {
  const stats = getProductStats(products);
  
  // Agrupar categorías con conteo
  const categories = Array.from(stats.categoriesCount.entries()).map(
    ([name, count]) => ({ name, count })
  ).sort((a, b) => b.count - a.count);

  // Obtener porcentajes de descuento únicos
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
    totalProducts: allProducts.length,
    filteredProducts: products.length
  };
}

/**
 * FUNCIÓN PRINCIPAL: Aplica múltiples filtros a un array de productos
 * Soporta combinaciones complejas de filtros
 * @param products - Array de productos a filtrar
 * @param filters - Objeto con filtros a aplicar
 * @returns Array de productos que cumplen TODOS los filtros
 *
 * EJEMPLO DE USO:
 * const filteredProducts = filterProducts(allProducts, {
 *   categoria: 'blanquería',
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

  // Filtro por búsqueda
  if (filters.searchQuery) {
    result = searchProducts(result, filters.searchQuery);
  }

  // Filtro por categoría
  if (filters.categoria) {
    result = result.filter(
      p => p.categoria.toLowerCase() === filters.categoria!.toLowerCase()
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
 * Ordena productos según criterio especificado
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
      // Asumir que ID más alto = más nuevo (por consistencia con datos)
      return sorted.sort((a, b) => b.id - a.id);
    
    case 'popularity':
      // Asumir que destacado = más popular
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
 * FUNCIÓN PARA UI AVANZADA: Útil para components que necesitan actualizar
 * los filtros disponibles después de aplicar filtros
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
 * Paginación simple de productos
 * @param products - Array de productos
 * @param page - Número de página (1-indexed)
 * @param itemsPerPage - Items por página
 * @returns Productos de la página especificada
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
 * Obtiene información de paginación
 * @param total - Total de items
 * @param itemsPerPage - Items por página
 * @returns Objeto con info de paginación
 */
export function getPaginationInfo(total: number, itemsPerPage: number = 12) {
  return {
    totalPages: Math.ceil(total / itemsPerPage),
    totalItems: total,
    itemsPerPage
  };
}
