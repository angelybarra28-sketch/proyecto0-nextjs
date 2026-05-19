# 📖 EJEMPLOS PRÁCTICOS - SISTEMA DE FILTROS

## 🎯 Casos de uso reales para tu proyecto

---

## CASO 1: Página de categoría mejorada

### ANTES (sin sistema de filtros)
```typescript
// app/categoria/[categoria]/page.tsx
'use client';
import { useState } from 'react';
import { allProducts } from '@/lib/products';
import ProductCard from '@/components/Product/ProductCard';

export default function CategoryPage({ params }: any) {
  const categoryProducts = allProducts.filter(
    p => p.categoria === params.categoria
  );

  return (
    <div className="grid grid-cols-3 gap-4">
      {categoryProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### DESPUÉS (con sistema de filtros - COMPATIBLE)
```typescript
// app/categoria/[categoria]/page.tsx
'use client';
import { useState, useMemo } from 'react';
import { filterProducts, getFilterOptions } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import ProductCard from '@/components/Product/ProductCard';
import type { ProductFilters } from '@/lib/types';

export default function CategoryPage({ params }: any) {
  const [filters, setFilters] = useState<ProductFilters>({
    categoria: params.categoria
  });
  const [maxPrice, setMaxPrice] = useState<number>(50000);
  const [inStockOnly, setInStockOnly] = useState(false);

  const categoryProducts = useMemo(() => {
    return filterProducts(allProducts, {
      ...filters,
      maxPrice: maxPrice,
      inStock: inStockOnly || undefined
    });
  }, [filters, maxPrice, inStockOnly]);

  return (
    <div>
      {/* Filtros simples (SIN romper CSS) */}
      <div className="p-4 bg-gray-100 rounded mb-6">
        <div className="flex gap-4">
          {/* Slider de precio */}
          <div className="flex-1">
            <label className="block text-sm font-bold mb-2">
              Precio máximo: ${maxPrice}
            </label>
            <input
              type="range"
              min="0"
              max="50000"
              step="1000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Checkbox stock */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              <span>Solo disponibles</span>
            </label>
          </div>
        </div>
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-3 gap-4">
        {categoryProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Resumen */}
      <p className="mt-4 text-gray-600">
        Mostrando {categoryProducts.length} de {allProducts.length} productos
      </p>
    </div>
  );
}
```

**¿Qué cambió?**
- ✅ ProductCard sigue recibiendo lo mismo
- ✅ Grid sigue igual
- ✅ CSS intacto
- ✅ Solo se agregó lógica de filtros

---

## CASO 2: Búsqueda y filtros combinados

```typescript
// app/buscar/page.tsx (NUEVA PÁGINA)
'use client';
import { useState, useMemo } from 'react';
import { filterProducts, getFilterOptions } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import ProductCard from '@/components/Product/ProductCard';
import type { ProductFilters } from '@/lib/types';

export default function SearchPage({
  searchParams
}: {
  searchParams: { q?: string }
}) {
  const query = searchParams.q || '';

  const [filters, setFilters] = useState<ProductFilters>({
    searchQuery: query
  });

  const results = useMemo(() => {
    return filterProducts(allProducts, filters);
  }, [filters]);

  const options = useMemo(() => {
    return getFilterOptions(results);
  }, [results]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">
        Resultados de búsqueda: "{query}"
      </h1>

      <div className="grid grid-cols-4 gap-6">
        {/* PANEL DE FILTROS */}
        <div className="col-span-1">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-bold mb-4">Filtros</h2>

            {/* Categorías */}
            <div className="mb-4">
              <h3 className="font-semibold text-sm mb-2">Categoría</h3>
              {options.categories.map(cat => (
                <label key={cat.name} className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={filters.categoria === cat.name}
                    onChange={(e) =>
                      setFilters(prev => ({
                        ...prev,
                        categoria: e.target.checked ? cat.name : undefined
                      }))
                    }
                  />
                  <span className="text-sm">
                    {cat.name} ({cat.count})
                  </span>
                </label>
              ))}
            </div>

            {/* Rango de precio */}
            <div className="mb-4">
              <h3 className="font-semibold text-sm mb-2">Precio</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ''}
                  onChange={(e) =>
                    setFilters(prev => ({
                      ...prev,
                      minPrice: e.target.value ? parseInt(e.target.value) : undefined
                    }))
                  }
                  className="w-full px-2 py-1 border rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ''}
                  onChange={(e) =>
                    setFilters(prev => ({
                      ...prev,
                      maxPrice: e.target.value ? parseInt(e.target.value) : undefined
                    }))
                  }
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>

            {/* Descuentos */}
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.discountOnly === true}
                  onChange={(e) =>
                    setFilters(prev => ({
                      ...prev,
                      discountOnly: e.target.checked || undefined
                    }))
                  }
                />
                <span className="text-sm">Solo descuentos</span>
              </label>
            </div>

            {/* Stock */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.inStock === true}
                  onChange={(e) =>
                    setFilters(prev => ({
                      ...prev,
                      inStock: e.target.checked || undefined
                    }))
                  }
                />
                <span className="text-sm">Solo disponibles</span>
              </label>
            </div>
          </div>
        </div>

        {/* GRID DE PRODUCTOS */}
        <div className="col-span-3">
          {results.length > 0 ? (
            <>
              <p className="text-gray-600 mb-4">
                {results.length} productos encontrados
              </p>
              <div className="grid grid-cols-3 gap-4">
                {results.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No se encontraron productos
              </p>
              <p className="text-gray-400 text-sm">
                Intenta cambiar los filtros
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## CASO 3: Widget reutilizable de filtros

```typescript
// components/Filters/FilterWidget.tsx
'use client';
import { useState } from 'react';
import type { ProductFilters, FilterOptions } from '@/lib/types';

interface FilterWidgetProps {
  options: FilterOptions;
  onFiltersChange: (filters: ProductFilters) => void;
  defaultFilters?: ProductFilters;
}

export default function FilterWidget({
  options,
  onFiltersChange,
  defaultFilters = {}
}: FilterWidgetProps) {
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters);

  const handleFilterChange = (newFilters: ProductFilters) => {
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h2 className="text-lg font-bold mb-4">Filtrar productos</h2>

      {/* Categorías */}
      <div className="mb-6">
        <h3 className="font-semibold text-sm mb-3">Por categoría</h3>
        <div className="space-y-2">
          {options.categories.map(cat => (
            <label key={cat.name} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="category"
                value={cat.name}
                checked={filters.categoria === cat.name}
                onChange={() =>
                  handleFilterChange({
                    ...filters,
                    categoria: cat.name
                  })
                }
              />
              <span className="text-sm">
                {cat.name} ({cat.count})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Rango de precio */}
      <div className="mb-6">
        <h3 className="font-semibold text-sm mb-3">Precio</h3>
        <input
          type="range"
          min={options.priceRange.min}
          max={options.priceRange.max}
          step={options.priceRange.step || 1000}
          value={filters.maxPrice || options.priceRange.max}
          onChange={(e) =>
            handleFilterChange({
              ...filters,
              maxPrice: parseInt(e.target.value)
            })
          }
          className="w-full"
        />
        <div className="text-sm text-gray-600 mt-2">
          Hasta: ${filters.maxPrice || options.priceRange.max}
        </div>
      </div>

      {/* Descuentos */}
      {options.discountPercentages.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-sm mb-3">Descuentos</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.discountOnly === true}
              onChange={(e) =>
                handleFilterChange({
                  ...filters,
                  discountOnly: e.target.checked || undefined
                })
              }
            />
            <span className="text-sm">
              Con descuento ({options.totalProducts - options.filteredProducts})
            </span>
          </label>
        </div>
      )}

      {/* Stock */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.inStock === true}
            onChange={(e) =>
              handleFilterChange({
                ...filters,
                inStock: e.target.checked || undefined
              })
            }
          />
          <span className="text-sm">Solo disponibles en stock</span>
        </label>
      </div>

      {/* Limpiar filtros */}
      <button
        onClick={() => handleFilterChange({})}
        className="mt-6 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm font-semibold"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
```

### Uso del widget:

```typescript
'use client';
import { useState, useMemo } from 'react';
import { filterProducts, getFilterOptions } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import FilterWidget from '@/components/Filters/FilterWidget';
import ProductCard from '@/components/Product/ProductCard';
import type { ProductFilters } from '@/lib/types';

export default function ShopPage() {
  const [filters, setFilters] = useState<ProductFilters>({});

  const filtered = useMemo(
    () => filterProducts(allProducts, filters),
    [filters]
  );

  const options = useMemo(
    () => getFilterOptions(filtered),
    [filtered]
  );

  return (
    <div className="grid grid-cols-4 gap-6 p-8">
      {/* Filtros en sidebar */}
      <FilterWidget
        options={options}
        onFiltersChange={setFilters}
        defaultFilters={filters}
      />

      {/* Grid de productos */}
      <div className="col-span-3">
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## CASO 4: Componente de oferta especial

```typescript
// components/Sections/SpecialOffers.tsx
'use client';
import { getDiscountedProducts, getAvailableProducts } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import ProductCarousel from '@/components/Product/ProductCarousel';

export default function SpecialOffers() {
  // Obtener productos con descuento Y disponibles
  const discounted = getDiscountedProducts(allProducts);
  const available = getAvailableProducts(discounted).slice(0, 8);

  if (available.length === 0) return null;

  return (
    <section className="py-8 bg-yellow-50">
      <h2 className="text-2xl font-bold mb-4">Ofertas Especiales 🔥</h2>
      <ProductCarousel products={available} />
    </section>
  );
}
```

---

## CASO 5: Dashboard para admin

```typescript
// app/admin/analytics.tsx (FUTURO)
'use client';
import { getProductStats, getDiscountedProducts } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';

export default function AdminAnalytics() {
  const stats = getProductStats(allProducts);
  const discounted = getDiscountedProducts(allProducts);

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-blue-100 p-4 rounded">
        <h3 className="text-sm text-gray-600">Total productos</h3>
        <p className="text-2xl font-bold">{stats.totalProducts}</p>
      </div>

      <div className="bg-green-100 p-4 rounded">
        <h3 className="text-sm text-gray-600">Con stock</h3>
        <p className="text-2xl font-bold">{stats.availableCount}</p>
      </div>

      <div className="bg-yellow-100 p-4 rounded">
        <h3 className="text-sm text-gray-600">Con descuento</h3>
        <p className="text-2xl font-bold">{discounted.length}</p>
      </div>

      <div className="bg-purple-100 p-4 rounded">
        <h3 className="text-sm text-gray-600">Precio promedio</h3>
        <p className="text-2xl font-bold">${stats.averagePrice}</p>
      </div>
    </div>
  );
}
```

---

## CASO 6: Hook personalizado para filtros

```typescript
// hooks/useProductFilters.ts
'use client';
import { useState, useMemo } from 'react';
import { filterProducts, getFilterOptions } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import type { ProductFilters } from '@/lib/types';

export function useProductFilters(initialFilters: ProductFilters = {}) {
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);

  const filtered = useMemo(
    () => filterProducts(allProducts, filters),
    [filters]
  );

  const options = useMemo(
    () => getFilterOptions(filtered),
    [filtered]
  );

  const applyFilter = (newFilters: ProductFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const addFilter = (key: keyof ProductFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return {
    filters,
    products: filtered,
    options,
    applyFilter,
    clearFilters,
    addFilter,
    totalResults: filtered.length
  };
}
```

### Uso del hook:

```typescript
'use client';
import { useProductFilters } from '@/hooks/useProductFilters';

export default function ProductPage() {
  const {
    filters,
    products,
    options,
    applyFilter,
    clearFilters,
    totalResults
  } = useProductFilters({ categoria: 'blanquería' });

  return (
    <div>
      <p>Encontrados: {totalResults}</p>
      <button onClick={clearFilters}>Limpiar</button>
      {/* Renderizar */}
    </div>
  );
}
```

---

## CASO 7: Búsqueda con destacados

```typescript
'use client';
import { useState } from 'react';
import { searchProducts, getFeaturedProducts } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import ProductCard from '@/components/Product/ProductCard';

export default function SearchComponent() {
  const [query, setQuery] = useState('');

  const results = query
    ? searchProducts(allProducts, query)
    : getFeaturedProducts();

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-2 border rounded"
      />

      <div className="mt-6 grid grid-cols-4 gap-4">
        {results.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <p className="text-gray-600 mt-4">
        {results.length} {query ? 'resultados' : 'destacados'}
      </p>
    </div>
  );
}
```

---

## RESUMEN: Cuándo usar cada función

| Función | Cuándo | Ejemplo |
|---|---|---|
| `getDiscountedProducts()` | Solo productos rebajados | Widget de ofertas |
| `getAvailableProducts()` | Solo con stock | Filtro de disponibilidad |
| `getProductsByPriceRange()` | Rango de precio específico | Slider de precio |
| `searchProducts()` | Búsqueda por texto | Buscador |
| `filterProducts()` | Filtros complejos combinados | ⭐ LA MÁS IMPORTANTE |
| `getFilterOptions()` | Opciones para UI | Dropdowns dinámicos |
| `getProductStats()` | Analytics | Dashboard admin |
| `sortProducts()` | Ordenamiento | Selector de orden |
| `paginateProducts()` | Dividir en páginas | Paginación |

---

## 🧪 TEST RÁPIDO

Copia esto en cualquier página para verificar:

```typescript
'use client';
import { filterProducts, getFilterOptions, searchProducts } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';

export default function TestPage() {
  // Test 1: Filtro por categoría
  const blanqueria = filterProducts(allProducts, { categoria: 'blanquería' });

  // Test 2: Búsqueda
  const sabanas = searchProducts(allProducts, 'sábanas');

  // Test 3: Filtros complejos
  const complex = filterProducts(allProducts, {
    categoria: 'blanquería',
    maxPrice: 20000,
    inStock: true,
    discountOnly: true
  });

  // Test 4: Opciones
  const options = getFilterOptions(complex);

  return (
    <div className="p-8 space-y-4">
      <p>✅ Blanquería: {blanqueria.length} productos</p>
      <p>✅ Búsqueda "sábanas": {sabanas.length} resultados</p>
      <p>✅ Complejos: {complex.length} productos</p>
      <p>✅ Categorías disponibles: {options.categories.length}</p>
    </div>
  );
}
```

---

**¡Todos los ejemplos son compatibles 100% con tu frontend actual!**
