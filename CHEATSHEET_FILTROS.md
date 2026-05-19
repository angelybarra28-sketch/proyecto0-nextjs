# ⚡ REFERENCIA RÁPIDA - SISTEMA DE FILTROS

## 📌 IMPORTES NECESARIOS

```typescript
import type { ProductFilters, FilterOptions, FilteredProductsResult } from '@/lib/types';
import { 
  filterProducts,
  getDiscountedProducts,
  getAvailableProducts,
  getProductsByPriceRange,
  searchProducts,
  getProductStats,
  getFilterOptions,
  sortProducts,
  applyFiltersWithOptions,
  paginateProducts,
  getPaginationInfo
} from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
```

---

## 🔧 FUNCIONES DISPONIBLES

### 1️⃣ `filterProducts(products, filters)` ⭐

La FUNCIÓN PRINCIPAL. Aplica todos los filtros.

```typescript
// Sintaxis
filterProducts(productos: Product[], filtros: ProductFilters): Product[]

// Uso básico
filterProducts(allProducts, { categoria: 'blanquería' })

// Uso avanzado
filterProducts(allProducts, {
  categoria: 'blanquería',
  minPrice: 5000,
  maxPrice: 20000,
  inStock: true,
  discountOnly: true,
  sortBy: 'price-asc'
})

// Todos los filtros disponibles:
{
  categoria?: string;           // Filtrar por categoría exacta
  minPrice?: number;            // Precio mínimo (incluye ese precio)
  maxPrice?: number;            // Precio máximo (incluye ese precio)
  inStock?: boolean;            // true = solo con stock
  discountOnly?: boolean;       // true = solo con descuento
  tags?: string[];              // Buscar en tags
  searchQuery?: string;         // Búsqueda por texto
  sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'popularity';
  page?: number;                // Número de página
  limit?: number;               // Items por página
}
```

### 2️⃣ `getDiscountedProducts(products)`

Retorna solo productos con descuento.

```typescript
const discounted = getDiscountedProducts(allProducts);
// → Solo productos donde discount !== ''
```

### 3️⃣ `getAvailableProducts(products)`

Retorna solo productos con `stock > 0`.

```typescript
const inStock = getAvailableProducts(allProducts);
```

### 4️⃣ `getProductsByPriceRange(products, min, max)`

Filtra por rango de precio (ambos inclusos).

```typescript
const expensive = getProductsByPriceRange(allProducts, 10000, 30000);
```

### 5️⃣ `searchProducts(products, query)`

Búsqueda case-insensitive en nombre/descripción.

```typescript
const results = searchProducts(allProducts, 'sábanas');
// Busca en: name, description, categoria
```

### 6️⃣ `getProductStats(products)` 📊

Retorna estadísticas del array.

```typescript
const stats = getProductStats(allProducts);

// Retorna:
{
  totalProducts: 50,
  categoriesCount: Map { 'blanquería' => 15, 'otro' => 35 },
  priceRange: { min: 3990, max: 24999 },
  discountedCount: 28,
  availableCount: 48,
  averagePrice: 12434,
  tagFrequency: Map {}
}
```

### 7️⃣ `getFilterOptions(products)` 🎨

Opciones para renderizar UI de filtros.

```typescript
const options = getFilterOptions(filtered);

// Retorna:
{
  categories: [
    { name: 'blanquería', count: 15 },
    { name: 'otro', count: 5 }
  ],
  priceRange: {
    min: 3990,
    max: 24999,
    step: 1000
  },
  discountPercentages: [34, 20, 15],
  tags: [],
  totalProducts: 50,
  filteredProducts: 20
}
```

### 8️⃣ `sortProducts(products, sortBy)`

Ordena por criterio.

```typescript
sortProducts(products, 'price-asc');
// Opciones: 'price-asc' | 'price-desc' | 'newest' | 'popularity'
```

### 9️⃣ `applyFiltersWithOptions(products, filters)`

Filtro + opciones actualizadas (útil para UI que necesita refrescar opciones).

```typescript
const result = applyFiltersWithOptions(allProducts, {
  categoria: 'blanquería',
  maxPrice: 20000
});

// Retorna:
{
  products: [...],           // Filtrados
  total: 15,                 // Cantidad
  filters: {...},            // Filtros aplicados
  options: {...}             // Opciones disponibles
}
```

### 🔟 `paginateProducts(products, page, itemsPerPage)`

Divide en páginas.

```typescript
paginateProducts(products, 1, 12);  // Página 1, 12 items
// Retorna: items 0-11

paginateProducts(products, 2, 12);  // Página 2, 12 items
// Retorna: items 12-23
```

### 1️⃣1️⃣ `getPaginationInfo(total, itemsPerPage)`

Información para renderizar paginación.

```typescript
const info = getPaginationInfo(50, 12);

// Retorna:
{
  totalPages: 5,      // ceil(50 / 12)
  totalItems: 50,
  itemsPerPage: 12
}
```

---

## 💡 EJEMPLOS RÁPIDOS

### Ejemplo 1: Página actual + descuentos
```typescript
const onSaleProducts = filterProducts(allProducts, {
  discountOnly: true,
  inStock: true
});
```

### Ejemplo 2: Producto dentro de rango de precio
```typescript
const midRange = filterProducts(allProducts, {
  minPrice: 5000,
  maxPrice: 15000
});
```

### Ejemplo 3: Búsqueda + filtro de precio
```typescript
const searchResults = filterProducts(allProducts, {
  searchQuery: 'sábanas',
  maxPrice: 10000
});
```

### Ejemplo 4: Categoría + Stock + Precio
```typescript
const available = filterProducts(allProducts, {
  categoria: 'blanquería',
  inStock: true,
  maxPrice: 20000,
  sortBy: 'price-asc'
});
```

### Ejemplo 5: Análisis de datos
```typescript
const stats = getProductStats(allProducts);
console.log(`Promedio: $${stats.averagePrice}`);
console.log(`Con stock: ${stats.availableCount}`);
console.log(`Con descuento: ${stats.discountedCount}`);
```

---

## 🎨 PATRONES DE USO EN COMPONENTES

### Patrón A: Filtro estático (sin interacción)

```typescript
'use client';
import { filterProducts } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';

export default function FeaturedProducts() {
  const featured = filterProducts(allProducts, {
    discountOnly: true,
    inStock: true,
    sortBy: 'price-asc'
  });

  return <div>{/* renderizar featured */}</div>;
}
```

**Cuándo usar:** Secciones fijas, sin interacción del usuario

---

### Patrón B: Filtro interactivo (con estado)

```typescript
'use client';
import { useState, useMemo } from 'react';
import { filterProducts } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import type { ProductFilters } from '@/lib/types';

export default function FilteredProducts() {
  const [filters, setFilters] = useState<ProductFilters>({});

  const products = useMemo(
    () => filterProducts(allProducts, filters),
    [filters]  // ← IMPORTANTE: incluir dependencias
  );

  return (
    <div>
      <button onClick={() => setFilters({ categoria: 'blanquería' })}>
        Blanquería
      </button>
      {/* renderizar products */}
    </div>
  );
}
```

**Cuándo usar:** Botones, dropdowns, checkboxes

---

### Patrón C: Múltiples controles

```typescript
'use client';
import { useState, useMemo } from 'react';
import { filterProducts, getFilterOptions } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';

export default function AdvancedShop() {
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState(50000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<any>();

  const products = useMemo(() => {
    return filterProducts(allProducts, {
      categoria: category || undefined,
      maxPrice,
      inStock: inStockOnly || undefined,
      sortBy
    });
  }, [category, maxPrice, inStockOnly, sortBy]);

  const options = useMemo(() => {
    return getFilterOptions(products);
  }, [products]);

  return (
    <div>
      <select onChange={(e) => setCategory(e.target.value)}>
        {options.categories.map(cat => (
          <option key={cat.name}>{cat.name}</option>
        ))}
      </select>

      <input
        type="range"
        value={maxPrice}
        onChange={(e) => setMaxPrice(parseInt(e.target.value))}
      />

      <label>
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => setInStockOnly(e.target.checked)}
        />
        Solo disponibles
      </label>

      {/* Renderizar products */}
    </div>
  );
}
```

**Cuándo usar:** Tienda con múltiples filtros

---

## 📊 TABLA DE REFERENCIA

| Función | Entrada | Salida | Uso |
|---------|---------|--------|-----|
| `filterProducts` | (products, filters) | Product[] | Filtrar todo |
| `getDiscounted` | products | Product[] | Solo con descuento |
| `getAvailable` | products | Product[] | Solo con stock |
| `getByPrice` | (products, min, max) | Product[] | Rango precio |
| `search` | (products, query) | Product[] | Búsqueda texto |
| `getStats` | products | ProductStats | Análisis datos |
| `getOptions` | products | FilterOptions | Opciones UI |
| `sort` | (products, by) | Product[] | Ordenar |
| `applyWithOptions` | (products, filters) | Result | Filtro + opciones |
| `paginate` | (products, page, size) | Product[] | Página |
| `getPageInfo` | (total, size) | PageInfo | Info paginación |

---

## 🚨 ERRORES COMUNES

### ❌ No usar `useMemo`

```typescript
// ❌ MALO - Recalcula cada render
const products = filterProducts(allProducts, filters);
```

```typescript
// ✅ BUENO - Cachea resultado
const products = useMemo(
  () => filterProducts(allProducts, filters),
  [filters]
);
```

---

### ❌ Olvidar dependencias

```typescript
// ❌ MALO - Nunca recalcula, usa valor inicial
const products = useMemo(
  () => filterProducts(allProducts, filters),
  []  // ← INCORRECTO
);
```

```typescript
// ✅ BUENO
const products = useMemo(
  () => filterProducts(allProducts, filters),
  [filters]  // ← CORRECTO
);
```

---

### ❌ Modificar `allProducts`

```typescript
// ❌ MALO - Modifica array original
allProducts.push(newProduct);

// ✅ BUENO - Crea nuevo array
const updatedProducts = [...allProducts, newProduct];
```

---

### ❌ Hardcodear lógica de filtros

```typescript
// ❌ MALO - Duplica código
const blanqueria = allProducts.filter(p => p.categoria === 'blanquería');
const other = allProducts.filter(p => p.categoria === 'otro');

// ✅ BUENO - Centralizado
const blanqueria = filterProducts(allProducts, { categoria: 'blanquería' });
const other = filterProducts(allProducts, { categoria: 'otro' });
```

---

## 🧪 TEST RÁPIDO

Copia esto en tu componente para verificar que funciona:

```typescript
'use client';
import { filterProducts, getFilterOptions } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';

export default function TestPage() {
  // Test 1
  const filtered1 = filterProducts(allProducts, { 
    categoria: 'blanquería' 
  });

  // Test 2
  const filtered2 = filterProducts(allProducts, { 
    categoria: 'blanquería',
    maxPrice: 20000,
    inStock: true,
    discountOnly: true
  });

  // Test 3
  const options = getFilterOptions(filtered2);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">✅ Tests</h1>
      
      <p>Test 1 - Blanquería: {filtered1.length} ✓</p>
      <p>Test 2 - Complejos: {filtered2.length} ✓</p>
      <p>Test 3 - Categorías: {options.categories.length} ✓</p>
      
      {filtered1.length > 0 && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          ✅ Sistema funcionando correctamente
        </div>
      )}
    </div>
  );
}
```

---

## 🎯 PRÓXIMAS FUNCIONALIDADES

### ✅ Ya implementadas
- Filtro por categoría
- Filtro por precio
- Filtro por stock
- Filtro por descuento
- Búsqueda por texto
- Ordenamiento
- Paginación
- Estadísticas

### 🚀 Fáciles de agregar
- Filtro por tags (estructura ya existe)
- Filtro por material (agregar a Product interface)
- Filtro por color (agregar a specifications)
- Filtro por tamaño (agregar a specifications)

### 📅 Futuro (cuando tengas BD)
- Filtro por calificación
- Filtro por disponibilidad regional
- Filtro por promoción activa
- Búsqueda fuzzy con Algolia
- Filtros dinámicos desde admin

---

## 📞 SOPORTE RÁPIDO

**¿Cuál es la diferencia entre estas?**

```typescript
// Obtiene productos disponibles
getAvailableProducts(products)  // stock > 0

// Obtiene productos con descuento
getDiscountedProducts(products)  // tiene discount

// Obtiene AMBOS
filterProducts(products, { inStock: true, discountOnly: true })
```

**¿Cuándo debo usar `useMemo`?**

- Siempre en componentes interactivos (con state)
- Siempre cuando los filtros cambian
- Nunca en componentes estáticos (sin state)

**¿Cómo agregar un nuevo filtro?**

1. Agregar propiedad a `ProductFilters` en `lib/types.ts`
2. Agregar condición en `filterProducts()` en `lib/product-utils.ts`
3. Usar en componentes

Ejemplo:
```typescript
// En types.ts
interface ProductFilters {
  material?: string;  // ← AGREGAR
}

// En product-utils.ts
if (filters.material) {
  result = result.filter(p => 
    p.specifications?.material.includes(filters.material!)
  );
}
```

---

**Última actualización:** 19/05/2026  
**Versión:** 1.0
