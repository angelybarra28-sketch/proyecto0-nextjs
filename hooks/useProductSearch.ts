'use client';

import { useState, useMemo, useRef } from 'react';
import { searchProducts, normalizeSearch } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import type { Product } from '@/lib/types';

export function useProductSearch(initialProducts: Product[] = allProducts, delayMs = 300) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [query, setQueryState] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');

  const handleSetQuery = (newQuery: string) => {
    setQueryState(newQuery);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(newQuery);
    }, delayMs);
  };

  const clearSearch = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setQueryState('');
    setDebouncedQuery('');
  };

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeSearch(debouncedQuery);
    return searchProducts(initialProducts, normalizedQuery);
  }, [initialProducts, debouncedQuery]);

  return {
    query,
    setQuery: handleSetQuery,
    filteredProducts,
    clearSearch,
    normalizeSearch,
    totalResults: filteredProducts.length,
    hasResults: filteredProducts.length > 0,
  };
}
