'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { searchProducts, normalizeSearch } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import type { Product } from '@/lib/product-utils';

/**
 * Hook reutilizable para gestionar el estado de búsqueda de productos con debounce profesional
 * y sincronización bidireccional con los parámetros de la URL.
 * 
 * @param initialProducts - Lista inicial de productos a filtrar (por defecto, todos los productos).
 * @param delayMs - Retraso del debounce en milisegundos (por defecto, 300ms).
 * @returns Un objeto con el estado de la búsqueda y los productos filtrados.
 */
export function useProductSearch(initialProducts: Product[] = allProducts, delayMs = 300) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Obtener la búsqueda inicial de la URL
  const initialQuery = searchParams.get('search') || '';

  // 2. Estado inmediato (para el input visual) y diferido/debounced (para búsqueda y URL)
  const [query, setQuery] = useState<string>(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialQuery);

  // 3. Sincronización instantánea ante navegación atrás/adelante del navegador (URL -> Estado)
  useEffect(() => {
    const urlQuery = searchParams.get('search') || '';
    if (urlQuery !== query) {
      // Cancelamos cualquier temporizador de tipeo pendiente para que la navegación sea instantánea
      if (timerRef.current) clearTimeout(timerRef.current);
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
    }
  }, [searchParams]);

  // Limpieza preventiva del temporizador al desmontar para evitar fugas de memoria
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 4. Sincronizar el estado de la URL con la query debounced de forma silenciosa
  const updateUrlParams = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const normalized = normalizeSearch(value);

    if (normalized) {
      params.set('search', value);
    } else {
      params.delete('search');
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // 5. Manejar el tipeo del usuario aplicando Debounce
  const handleSetQuery = (newQuery: string) => {
    // Actualizar el estado visual del input de inmediato (experiencia fluida sin lag)
    setQuery(newQuery);

    // Limpiar el temporizador previo si el usuario sigue escribiendo
    if (timerRef.current) clearTimeout(timerRef.current);

    // Programar la actualización del filtro y la URL tras la pausa
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(newQuery);
      updateUrlParams(newQuery);
    }, delayMs);
  };

  // 6. Limpieza instantánea de la búsqueda
  const clearSearch = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setQuery('');
    setDebouncedQuery('');
    updateUrlParams('');
  };

  // 7. El filtrado de productos se realiza únicamente sobre la query debounced (Alto Rendimiento)
  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeSearch(debouncedQuery);
    return searchProducts(initialProducts, normalizedQuery);
  }, [initialProducts, debouncedQuery]);

  return {
    query, // Pasado al valor inmediato del input
    setQuery: handleSetQuery, // Manejador debounced
    filteredProducts, // Resultados filtrados de forma eficiente
    clearSearch, // Reset instantáneo
    normalizeSearch,
    totalResults: filteredProducts.length,
    hasResults: filteredProducts.length > 0,
    isSearching: query !== debouncedQuery, // Permite saber si el debounce está esperando
  };
}
