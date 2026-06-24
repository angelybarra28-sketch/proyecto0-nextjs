# Sistema Profesional de Filtros — Arquitectura

## Resumen Ejecutivo

Sistema de filtros escalable, profesional y sin roturas para el ecommerce Next.js + TypeScript.

- Lógica centralizada en helpers (`lib/product-utils.ts`)
- Componentes intactos (cero cambios visuales)
- Tipado TypeScript estricto
- Preparado para futuro (DB, SSR, búsqueda avanzada)
- Reutilizable en cualquier página

---

## Vista General del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js + React)                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Components (Intactos, sin cambios)            │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │ ProductCard  │  │ProductCarousel│ │ProductsSection│   │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │ │
│  │         │                 │                 │             │ │
│  └─────────┼─────────────────┼─────────────────┼─────────────┘ │
│            │                 │                 │                │
│            └─────────────────┴─────────────────┘                │
│                      Reciben Product[]                          │
│                            │                                    │
│            ┌───────────────┴───────────────┐                   │
│            │                               │                   │
│  ┌─────────▼──────────────┐   ┌─────────▼──────────────┐       │
│  │   User State/Action    │   │  Browser Event        │       │
│  │  (setFilters onClick)  │   │  (onChange, onSubmit) │       │
│  └─────────┬──────────────┘   └──────────┬────────────┘       │
│            │                             │                     │
│            └─────────────────┬───────────┘                     │
│                              │                                 │
│                      useMemo + setState                        │
│                              │                                 │
│                              ▼                                 │
└──────────────────────────────────────────────────────────────┼──┘
                                                                 │
                                                                 │
┌───────────────────────────────────────────────────────────────▼──┐
│              lib/ (Business Logic — Lógica centralizada)         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    types.ts (TypeScript Types)              │ │
│  │                                                             │ │
│  │  ├─ ProductFilters          (Objeto con filtros)           │ │
│  │  ├─ FilterOptions           (Opciones para UI)             │ │
│  │  ├─ FilteredProductsResult  (Resultado completo)           │ │
│  │  └─ ProductStats            (Estadísticas)                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              product-utils.ts (Helper Functions)            │ │
│  │                                                             │ │
│  │  ⭐ NUEVAS FUNCIONES:                                      │ │
│  │  ├─ filterProducts()          ⭐⭐⭐ PRINCIPAL             │ │
│  │  ├─ searchProducts()                                       │ │
│  │  ├─ getFilterOptions()                                     │ │
│  │  ├─ getProductStats()                                      │ │
│  │  ├─ sortProducts()                                         │ │
│  │  ├─ paginateProducts()                                     │ │
│  │  └─ getPaginationInfo()                                    │ │
│  │                                                             │ │
│  │  FUNCIONES BÁSICAS:                                        │ │
│  │  ├─ getDiscountedProducts()                                │ │
│  │  ├─ getAvailableProducts()                                 │ │
│  │  └─ getProductsByPriceRange()                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              products.ts (Data Source)                      │ │
│  │                                                             │ │
│  │  export const productData = { section1: ..., section2: ... }│ │
│  │  export const allProducts = [...]  (Intacto)                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos Detallado

```
USUARIO INTERACTÚA CON UI
    • Click en checkbox "Solo disponibles"
    • Mueve slider de precio
    • Selecciona categoría en dropdown
    • Escribe en input de búsqueda
            │
            ▼
    Evento React (onChange, etc)
    → setFilters(newFilters)
    → setState actualiza estado
            │
            ▼
    useMemo detecta cambio
    en [filters] dependencia
    → Ejecuta función en useMemo
            │
            ▼
    filterProducts(allProducts, filters)
    1. Búsqueda (if searchQuery)
    2. Categoría (if categoria)
    3. Rango precio (if min/maxPrice)
    4. Stock (if inStock)
    5. Descuento (if discountOnly)
    6. Tags (if tags)
    7. Ordenamiento (if sortBy)
    Retorna: Product[] filtrado
            │
            ▼
    const products = filtered
    useMemo cacheó el resultado
    (no recalcula hasta cambio)
            │
            ▼
    React re-renderiza componente
    con nuevo array de productos
            │
            ▼
    Componente renderiza <ProductCard>
    para cada producto en el array
    mismo componente, mismos props,
    solo DIFERENTE cantidad/selección
```

### Orden de aplicación de filtros

1. **Búsqueda** (searchQuery)
2. **Categoría** (categoria)
3. **Precio** (minPrice, maxPrice)
4. **Stock** (inStock)
5. **Descuento** (discountOnly)
6. **Tags** (tags)
7. **Ordenamiento** (sortBy)

---

## TypeScript Types

### `ProductFilters` — Objeto de filtros

```typescript
interface ProductFilters {
  categoria?: string;           // Filtrar por categoría
  minPrice?: number;            // Precio mínimo
  maxPrice?: number;            // Precio máximo
  inStock?: boolean;            // Solo productos con stock
  discountOnly?: boolean;       // Solo productos con descuento
  tags?: string[];              // Tags (preparado para futuro)
  searchQuery?: string;         // Búsqueda por texto
  sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'popularity';
  page?: number;                // Para paginación
  limit?: number;               // Items por página
}
```

Todos los campos son OPCIONALES → máxima flexibilidad.

### `FilterOptions` — Opciones para UI

```typescript
interface FilterOptions {
  categories: Array<{ name: string; count: number }>;
  priceRange: { min: number; max: number; step?: number };
  discountPercentages: number[];
  tags: Array<{ name: string; count: number }>;
  totalProducts: number;
  filteredProducts: number;
}
```

### `FilteredProductsResult` — Resultado completo

```typescript
interface FilteredProductsResult {
  products: Product[];           // Productos filtrados
  total: number;                 // Cantidad total
  filters: ProductFilters;       // Filtros aplicados
  options: FilterOptions;        // Opciones actualizadas
}
```

---

## Funciones Helper

Todas en `lib/product-utils.ts`.

### Función Principal

#### `filterProducts(products, filters)` ⭐

Aplica MÚLTIPLES FILTROS combinados. Corazón del sistema.

```typescript
// Ejemplo 1: Filtro simple por categoría
const blanqueria = filterProducts(allProducts, {
  categoria: 'blanquería'
});

// Ejemplo 2: Filtros combinados complejos
const filtered = filterProducts(allProducts, {
  categoria: 'blanquería',
  maxPrice: 20000,
  inStock: true,
  discountOnly: true,
  sortBy: 'price-asc'
});

// Ejemplo 3: Búsqueda + filtros
const results = filterProducts(allProducts, {
  searchQuery: 'sábanas',
  maxPrice: 15000,
  inStock: true
});
```

### Funciones Básicas

| Función | Descripción |
|---------|-------------|
| `getDiscountedProducts(products)` | Retorna solo productos con descuento |
| `getAvailableProducts(products)` | Retorna solo productos con stock > 0 |
| `getProductsByPriceRange(products, min, max)` | Filtra por rango de precio |
| `searchProducts(products, query)` | Búsqueda por nombre/descripción (case-insensitive) |

### Funciones Avanzadas

| Función | Descripción |
|---------|-------------|
| `getProductStats(products)` | Estadísticas completas para análisis |
| `getFilterOptions(products)` | Retorna opciones para renderizar UI de filtros |
| `sortProducts(products, sortBy)` | Ordena por criterio |
| `applyFiltersWithOptions(products, filters)` | Filtro completo + opciones actualizadas |
| `paginateProducts(products, page, itemsPerPage)` | Paginación simple |
| `getPaginationInfo(total, itemsPerPage)` | Info de paginación para UI |

### Función `filterProducts()` paso a paso

```typescript
export function filterProducts(
  products: Product[],           // Array original
  filters: ProductFilters        // Criterios a aplicar
): Product[] {
  let result = [...products];    // 1. Crear copia (no modificar original)

  // 2. Aplicar cada filtro secuencialmente
  if (filters.searchQuery) {
    result = searchProducts(result, filters.searchQuery);
  }

  if (filters.categoria) {
    result = result.filter(p =>
      p.categoria.toLowerCase() === filters.categoria!.toLowerCase()
    );
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const minPrice = filters.minPrice ?? 0;
    const maxPrice = filters.maxPrice ?? Infinity;
    result = result.filter(
      p => p.priceNumber >= minPrice && p.priceNumber <= maxPrice
    );
  }

  // ... más filtros ...

  // 3. Ordenar si aplica
  if (filters.sortBy) {
    result = sortProducts(result, filters.sortBy);
  }

  // 4. Retornar resultado
  return result;
}
```

**Observaciones:**
- Crea copia del array (no modifica original)
- Aplica filtros secuencialmente
- Cada filtro es independiente
- Retorna nuevo array con resultados
- Performance O(n*m) donde n=productos, m=filtros

---

## Ejemplos de Filtros en Acción

### Caso 1: Filtro simple
```
filterProducts(allProducts, { categoria: 'blanquería' })

allProducts (50) → [Filtro categoría] → Resultado: 15 productos
```

### Caso 2: Filtros múltiples
```
filterProducts(allProducts, {
  categoria: 'blanquería',
  maxPrice: 20000,
  inStock: true
})

allProducts (50) → [Filtro categoría] → 15 → [Filtro maxPrice] → 12 → [Filtro inStock] → 11
```

### Caso 3: Búsqueda + Filtros
```
filterProducts(allProducts, {
  searchQuery: 'sábanas',
  categoria: 'blanquería',
  discountOnly: true
})

allProducts (50) → [Búsqueda 'sábanas'] → 8 → [Filtro categoría] → 6 → [Filtro descuento] → 4
```

---

## Compatibilidad Garantizada

**CERO cambios en:**
- `ProductCard.tsx` — Sigue recibiendo `Product`
- `ProductCarousel.tsx` — Sigue recibiendo `Product[]`
- `ProductsSection.tsx` — Sigue funcionando igual
- Página `/producto/[slug]` — Sin cambios
- Página `/categoria/[categoria]` — Sin cambios
- Carrito — Sin afectar
- Checkout — Sin afectar
- Componentes Layout — Sin afectar
- CSS/Tailwind — Intacto

---

## Ventajas del Sistema

| Característica | Antes | Después |
|---|---|---|
| Lógica de filtros | Hardcodeada en componentes | Centralizada en helpers |
| Reutilización | Copiar-pegar código | Importar función |
| Mantenimiento | Cambiar en 5 lugares | Cambiar en 1 lugar |
| Escalabilidad | Difícil | Fácil |
| Testing | Difícil | Fácil |
| Tipado | Parcial | Estricto |
| Futuro DB | Requeriría refactor | Mínimos cambios |

---

## Escalabilidad

### Fase 1: Local (YA IMPLEMENTADA)
```
allProducts (array) → filterProducts() (memoria) → Component renderiza resultado
```

### Fase 2: Database (FÁCIL)
```typescript
// Cuando tengas DB (Supabase, Firebase, etc):
async function filterProductsFromDB(filters: ProductFilters) {
  // La interfaz ProductFilters es agnóstica
  let query = db.select().from('products');
  if (filters.categoria) query = query.where('categoria', '=', filters.categoria);
  if (filters.maxPrice) query = query.where('price', '<=', filters.maxPrice);
  return query.execute();
}
```

### Fase 3: Búsqueda avanzada (OPCIONAL)
- Integración con Algolia
- Integración con ElasticSearch
- Búsqueda fuzzy

### Fase 4: Admin Panel
```typescript
// El mismo sistema funciona para admin
const adminFiltered = filterProducts(allProducts, {
  categoria: undefined,
  inStock: undefined,
  sortBy: 'newest'
});
```

---

## Conceptos Clave

### 1. Separación de responsabilidades
- `types.ts` → Define contratos
- `product-utils.ts` → Implementa lógica
- `ProductCard.tsx` → Solo renderiza

### 2. Composabilidad
- Funciones pequeñas que se pueden combinar
- `filterProducts()` es agnóstica, funciona con cualquier array

### 3. Escalabilidad horizontal
- Agregar nuevo filtro = agregar 1 condición en `filterProducts()`
- No afecta componentes

### 4. Single Responsibility Principle
- Cada función hace 1 cosa bien
- Fácil de entender y testear

---

## Documentación Relacionada

- `docs/guides/CHEATSHEET_FILTROS.md` — Referencia rápida de funciones
- `docs/guides/EJEMPLOS_FILTROS.md` — Ejemplos de código prácticos
- `docs/guides/QUICK_START.md` — Tutorial de 5 minutos
- `docs/guides/INTEGRACION_FILTROS.md` — Guía de integración
- `docs/guides/README_FILTROS.md` — README principal del sistema de filtros
- `docs/guides/RESUMEN_IMPLEMENTACION.md` — Resumen ejecutivo

---

*Documento fusionado desde ARQUITECTURA_VISUAL.md y FILTROS_ARQUITECTURA.md*
*Última actualización: Junio 2026*
