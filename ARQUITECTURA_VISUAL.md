# 🏗️ DIAGRAMA DE ARQUITECTURA - SISTEMA DE FILTROS

## 📊 VISTA GENERAL DEL SISTEMA

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
│              lib/ (Business Logic - Lógica centralizada)         │
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
│  │  FUNCIONES BÁSICAS:                                         │ │
│  │  ├─ getProductBySlug()                                      │ │
│  │  ├─ getProductById()                                        │ │
│  │  ├─ getProductsByCategory()                                 │ │
│  │  ├─ getRelatedProducts()                                    │ │
│  │  ├─ getAllProductSlugs()                                    │ │
│  │  ├─ getFeaturedProducts()                                   │ │
│  │  └─ [Anteriores sin cambios] ✅                             │ │
│  │                                                             │ │
│  │  ⭐ NUEVAS FUNCIONES BÁSICAS:                              │ │
│  │  ├─ getDiscountedProducts(products)                         │ │
│  │  ├─ getAvailableProducts(products)                          │ │
│  │  ├─ getProductsByPriceRange(products, min, max)             │ │
│  │  └─ searchProducts(products, query)                         │ │
│  │                                                             │ │
│  │  ⭐ NUEVAS FUNCIONES AVANZADAS:                            │ │
│  │  ├─ getProductStats(products)                              │ │
│  │  ├─ getFilterOptions(products)                              │ │
│  │  ├─ sortProducts(products, sortBy)                          │ │
│  │  ├─ applyFiltersWithOptions(products, filters)              │ │
│  │  ├─ paginateProducts(products, page, size)                  │ │
│  │  └─ getPaginationInfo(total, size)                          │ │
│  │                                                             │ │
│  │  🎯 FUNCIÓN PRINCIPAL:                                     │ │
│  │  └─ filterProducts(products, filters) ⭐⭐⭐             │ │
│  │     ↓ Aplica TODOS los filtros combinados                  │ │
│  │     ↓ Retorna Product[] filtrado                           │ │
│  │     ↓ LA MÁS IMPORTANTE                                    │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              products.ts (Data Source - Datos)              │ │
│  │                                                             │ │
│  │  export const productData = {                               │ │
│  │    section1: { ... },                                       │ │
│  │    section2: { ... },                                       │ │
│  │    ...                                                      │ │
│  │  };                                                         │ │
│  │                                                             │ │
│  │  export const allProducts = [...]  ✅ (Intacto)             │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUJO DE DATOS DETALLADO

```
┌────────────────────────────────────────────────────────────────┐
│ USUARIO INTERACTÚA CON UI                                      │
│                                                                │
│ • Click en checkbox "Solo disponibles"                         │
│ • Mueve slider de precio                                       │
│ • Selecciona categoría en dropdown                             │
│ • Escribe en input de búsqueda                                 │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │  Evento React (onChange, etc)    │
        │  → setFilters(newFilters)        │
        │  → setState actualiza estado     │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │  useMemo detecta cambio          │
        │  en [filters] dependencia        │
        │  → Ejecuta función en useMemo    │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────┐
        │  filterProducts(allProducts, filters)    │
        │                                          │
        │  1. Búsqueda (if searchQuery)           │
        │  2. Categoría (if categoria)            │
        │  3. Rango precio (if min/maxPrice)      │
        │  4. Stock (if inStock)                  │
        │  5. Descuento (if discountOnly)         │
        │  6. Tags (if tags)                      │
        │  7. Ordenamiento (if sortBy)            │
        │                                          │
        │  Retorna: Product[] filtrado            │
        └──────────────────┬───────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │  const products = filtered       │
        │  useMemo cacheó el resultado     │
        │  (no recalcula hasta cambio)     │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │  React re-renderiza componente   │
        │  con nuevo array de productos   │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────┐
        │  Componente renderiza <ProductCard>      │
        │  para cada producto en el array          │
        │  mismo componente, mismos props,         │
        │  solo DIFERENTE cantidad/selección       │
        └──────────────────────────────────────────┘
```

---

## 🎯 EJEMPLOS DE FILTROS EN ACCIÓN

### Caso 1: Filtro simple

```
filterProducts(allProducts, { categoria: 'blanquería' })

allProducts (50)
    ↓
[Filtro categoría]
    ↓
Resultado: 15 productos
```

### Caso 2: Filtros múltiples

```
filterProducts(allProducts, {
  categoria: 'blanquería',
  maxPrice: 20000,
  inStock: true
})

allProducts (50)
    ↓
[Filtro categoría] → 15 productos
    ↓
[Filtro maxPrice] → 12 productos
    ↓
[Filtro inStock] → 11 productos
    ↓
Resultado: 11 productos
```

### Caso 3: Búsqueda + Filtros

```
filterProducts(allProducts, {
  searchQuery: 'sábanas',
  categoria: 'blanquería',
  discountOnly: true
})

allProducts (50)
    ↓
[Búsqueda 'sábanas'] → 8 productos
    ↓
[Filtro categoría] → 6 productos
    ↓
[Filtro descuento] → 4 productos
    ↓
Resultado: 4 productos
```

---

## 📊 INTEGRACIÓN CON COMPONENTES

```
┌─────────────────────────────────────────────────────────────┐
│  app/categoria/[categoria]/page.tsx                         │
│                                                             │
│  export default function CategoryPage({ params }) {        │
│    const [maxPrice, setMaxPrice] = useState(50000);       │
│                                                             │
│    const products = useMemo(() =>                          │
│      filterProducts(allProducts, {                         │
│        categoria: params.categoria,                        │
│        maxPrice: maxPrice                                  │
│      }),                                                   │
│      [params.categoria, maxPrice]                          │
│    );                                                      │
│                                                             │
│    return (                                                │
│      <>                                                    │
│        {/* UI Filtros */}                                  │
│        <input                                              │
│          onChange={(e) =>                                  │
│            setMaxPrice(parseInt(e.target.value))          │
│          }                                                 │
│        />                                                  │
│                                                             │
│        {/* Grid - MISMO COMPONENTE, DIFERENTE PRODUCTS */}│
│        <div className="grid grid-cols-3">                 │
│          {products.map(p => (                             │
│            <ProductCard key={p.id} product={p} />         │
│          ))}                                               │
│        </div>                                              │
│      </>                                                   │
│    );                                                      │
│  }                                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         ▲                                        ▲
         │                                        │
         └──────────┬─────────────────────────────┘
                    │
    Imports del nuevo sistema:
    • filterProducts (función)
    • allProducts (datos)
    • ProductFilters (tipo)
```

---

## 🌳 ÁRBOL DE ARCHIVOS

```
proyecto0-nextjs/
│
├── lib/
│   ├── types.ts              ✏️ EXTENDIDO (tipos)
│   │   └── ProductFilters, FilterOptions, etc.
│   │
│   ├── product-utils.ts      ✏️ EXTENDIDO (funciones)
│   │   ├── [Anteriores sin cambios]
│   │   ├── getDiscountedProducts()
│   │   ├── getAvailableProducts()
│   │   ├── getProductsByPriceRange()
│   │   ├── searchProducts()
│   │   ├── getProductStats()
│   │   ├── getFilterOptions()
│   │   ├── filterProducts()           ⭐ PRINCIPAL
│   │   ├── sortProducts()
│   │   ├── applyFiltersWithOptions()
│   │   ├── paginateProducts()
│   │   └── getPaginationInfo()
│   │
│   ├── products.ts           ✅ SIN CAMBIOS
│   ├── config.ts             ✅ SIN CAMBIOS
│   ├── authContext.tsx       ✅ SIN CAMBIOS
│   ├── cartContext.tsx       ✅ SIN CAMBIOS
│   └── product-utils.ts      ✅ (ANTERIORES SIN CAMBIOS)
│
├── app/                       ✅ SIN CAMBIOS
│   ├── page.tsx
│   ├── layout.tsx
│   └── [rutas dinámicas]/
│
├── components/                ✅ SIN CAMBIOS
│   ├── ProductCard.tsx
│   ├── ProductCarousel.tsx
│   └── ...
│
├── FILTROS_ARQUITECTURA.md    📄 NUEVA (documentación)
├── EJEMPLOS_FILTROS.md        📄 NUEVA (ejemplos)
├── INTEGRACION_FILTROS.md     📄 NUEVA (guía)
├── CHEATSHEET_FILTROS.md      📄 NUEVA (referencia rápida)
└── RESUMEN_IMPLEMENTACION.md  📄 NUEVA (resumen)
```

---

## 🔌 CONEXIONES Y DEPENDENCIAS

```
ProductCard.tsx
    ↓ (recibe)
Product[] (del componente padre)
    ↑ (de)
filterProducts(allProducts, filters)
    ↑ (usa)
{
  allProducts     (de products.ts)
  filters         (ProductFilters type)
  ProductFilters  (de types.ts)
}
    ↑ (componentes llaman)
Tu página con useState + useMemo
```

**Diagrama de dependencias:**

```
┌─────────────────────┐
│  Tu Componente      │ ← setState + useMemo
│  (ProductsPage)     │
└──────────┬──────────┘
           │
           ├─────→ importa filterProducts (product-utils.ts)
           ├─────→ importa allProducts (products.ts)
           ├─────→ importa ProductFilters (types.ts)
           │
           ▼
┌─────────────────────┐
│ filterProducts()    │
└──────────┬──────────┘
           │
           ├─────→ Aplica filtros
           ├─────→ Retorna Product[]
           │
           ▼
┌─────────────────────┐
│ ProductCard         │ (SIN CAMBIOS)
│ Renderiza producto  │
└─────────────────────┘
```

---

## ⚙️ CÓMO FUNCIONA INTERNAMENTE

### `filterProducts()` paso a paso

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

**Observaciones importantes:**
- ✅ Crea copia del array (no modifica original)
- ✅ Aplica filtros secuencialmente
- ✅ Cada filtro es independiente
- ✅ Retorna nuevo array con resultados
- ✅ Performance O(n*m) donde n=productos, m=filtros

---

## 🚀 ESCALABILIDAD: CÓMO CRECER

### Fase 1: Local (YA IMPLEMENTADA)
```
allProducts (array)
    ↓
filterProducts() (memoria)
    ↓
Component renderiza resultado
```

### Fase 2: Database (FÁCIL)
```
DB (Supabase/Firebase/PostgreSQL)
    ↓
async filterProductsFromDB(filters)
    ↓
Component renderiza resultado
```

**Cambio necesario:** Solo cambiar la fuente, interfaces iguales

### Fase 3: Búsqueda avanzada (OPCIONAL)
```
Algolia/ElasticSearch (índice)
    ↓
async searchProductsAdvanced(filters)
    ↓
Component renderiza resultado
```

---

## 💡 VENTAJAS ARQUITECTÓNICAS

### 1. **Separación clara**
```
Data (products.ts)
  ↓
Logic (product-utils.ts, types.ts)
  ↓
UI (componentes)
```

### 2. **Reutilización**
```
filterProducts() se usa en:
- Homepage
- Categoría
- Búsqueda
- Admin panel
- Reportes
- etc.
```

### 3. **Testeable**
```typescript
// Fácil de testear porque:
// - Entrada clara: products[], filters
// - Salida clara: Product[]
// - Sin side effects
// - Sin dependencies externas

describe('filterProducts', () => {
  it('filters by price', () => {
    const result = filterProducts(mockData, {
      minPrice: 100, maxPrice: 200
    });
    expect(result.every(p => p.price >= 100)).toBe(true);
  });
});
```

### 4. **Mantenible**
```
Agregar nuevo filtro = 3 pasos:
1. Agregar propiedad a ProductFilters
2. Agregar condición en filterProducts()
3. Usar en componentes
```

### 5. **Type-safe**
```typescript
// TypeScript previene errores:
filterProducts(allProducts, {
  nonExistentFilter: true  // ❌ Error de compilación
});

// Autocompletar completo:
filters.  // ← IDE muestra todas las opciones
```

---

**Diagrama actualizado:** 19/05/2026  
**Arquitectura:** ✅ Producción Ready  
**Escalabilidad:** ✅ Preparada para futuro
