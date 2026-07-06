import type { Product } from './types';

export type { Product };

export function normalizeSearch(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function searchProducts(products: Product[], query: string): Product[] {
  if (!query || query.trim() === '') return products;

  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return products;

  return products.filter(p => {
    const item = p as {
      name?: string;
      categoria?: string;
      category?: string;
      tags?: string[] | string;
      features?: string[] | string;
      shortDescription?: string;
      description?: string;
    };

    const nameMatch = item.name ? normalizeSearch(item.name).includes(normalizedQuery) : false;

    const categoryMatch = (item.categoria && normalizeSearch(item.categoria).includes(normalizedQuery)) ||
      (item.category && normalizeSearch(item.category).includes(normalizedQuery));

    let tagsMatch = false;
    if (item.tags) {
      if (Array.isArray(item.tags)) {
        tagsMatch = item.tags.some(tag => tag && normalizeSearch(tag).includes(normalizedQuery));
      } else if (typeof item.tags === 'string') {
        tagsMatch = normalizeSearch(item.tags).includes(normalizedQuery);
      }
    }

    let featuresMatch = false;
    if (item.features) {
      if (Array.isArray(item.features)) {
        featuresMatch = item.features.some(feature => feature && normalizeSearch(feature).includes(normalizedQuery));
      } else if (typeof item.features === 'string') {
        featuresMatch = normalizeSearch(item.features).includes(normalizedQuery);
      }
    }

    const shortDescMatch = item.shortDescription ? normalizeSearch(item.shortDescription).includes(normalizedQuery) : false;
    const descMatch = item.description ? normalizeSearch(item.description).includes(normalizedQuery) : false;

    return nameMatch || categoryMatch || tagsMatch || featuresMatch || shortDescMatch || descMatch;
  });
}
