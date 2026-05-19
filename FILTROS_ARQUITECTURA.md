# 🎯 SISTEMA PROFESIONAL DE FILTROS - ARQUITECTURA

## 📌 RESUMEN EJECUTIVO

Sistema de filtros **escalable, profesional y sin roturas** para tu ecommerce Next.js + TypeScript.

- ✅ **Lógica centralizada** en helpers
- ✅ **Componentes intactos** (cero cambios visuales)
- ✅ **Tipado TypeScript estricto**
- ✅ **Preparado para futuro** (DB, SSR, búsqueda avanzada)
- ✅ **Reutilizable en cualquier página**

---

## 📁 ESTRUCTURA DE ARCHIVOS MODIFICADOS

```
lib/
  ├── types.ts          ✏️ EXTENDIDO: + tipos de filtros
  ├── products.ts       ✅ SIN CAMBIOS (datos puros)
  ├── product-utils.ts  ✏️ EXTENDIDO: + funciones de filtrado
  └── config.ts         ✅ SIN CAMBIOS
  
app/
  ├── page.tsx          ✅ SIN CAMBIOS
  ├── producto/[slug]   ✅ SIN CAMBIOS
  └── categoria/        ✅ SIN CAMBIOS
  
components/
  ├── ProductCard.tsx   ✅ SIN CAMBIOS
  ├── ProductCarousel   ✅ SIN CAMBIOS
  └── ProductsSection   ✅ SIN CAMBIOS
```

---

## 🆕 NUEVOS TIPOS TYPESCRIPT

### `ProductFilters` - Objeto de filtros

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

**Todos los campos son OPCIONALES** → máxima flexibilidad

### `FilterOptions` - Opciones para UI

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

### `FilteredProductsResult` - Resultado completo

```typescript
interface FilteredProductsResult {
  products: Product[];           // Productos filtrados
  total: number;                 // Cantidad total
  filters: ProductFilters;       // Filtros aplicados
  options: FilterOptions;        // Opciones actualizadas
}
```

---

## 🔧 NUEVAS FUNCIONES HELPER

Todas en `lib/product-utils.ts`

### Funciones BÁSICAS (para lógica específica)

#### 1. **`getDiscountedProducts(products)`**
Retorna solo productos con descuento
```typescript
const discounted = getDiscountedProducts(allProducts);
```

#### 2. **`getAvailableProducts(products)`**
Retorna solo productos con `stock > 0`
```typescript
const available = getAvailableProducts(allProducts);
```

#### 3. **`getProductsByPriceRange(products, min, max)`**
Filtra por rango de precio
```typescript
const expensive = getProductsByPriceRange(allProducts, 10000, 30000);
```

#### 4. **`searchProducts(products, query)`**
Búsqueda por nombre/descripción (case-insensitive)
```typescript
const results = searchProducts(allProducts, 'sábanas');
```

### Funciones AVANZADAS (para UI)

#### 5. **`getProductStats(products)`** 
Estadísticas completas para análisis
```typescript
const stats = getProductStats(allProducts);
// → { totalProducts, categoriesCount, priceRange, ... }
```

#### 6. **`getFilterOptions(products)`**
Retorna opciones para renderizar UI de filtros
```typescript
const options = getFilterOptions(filtered);
// {
//   categories: [{ name: 'blanquería', count: 15 }, ...],
//   priceRange: { min: 3990, max: 24999, step: 1000 },
//   discountPercentages: [34, 20, 15],
//   filteredProducts: 42
// }
```

### 🎯 FUNCIÓN PRINCIPAL

#### 7. **`filterProducts(products, filters)` - LA ESTRELLA**

Aplica MÚLTIPLES FILTROS combinados. **Este es el corazón del sistema.**

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

**¿Por qué es mejor que `array.filter()` manual?**
- ✅ Lógica centralizada (una fuente de verdad)
- ✅ Consistencia garantizada
- ✅ Fácil de expandir (agregar nuevos filtros)
- ✅ Reutilizable en múltiples páginas
- ✅ Testeable
- ✅ Preparado para migrar a backend

### Funciones COMPLEMENTARIAS

#### 8. **`sortProducts(products, sortBy)`**
Ordena por criterio
```typescript
const sorted = sortProducts(products, 'price-asc');
```

#### 9. **`applyFiltersWithOptions(products, filters)`**
Filtro completo + opciones actualizadas (útil para UI avanzada)
```typescript
const result = applyFiltersWithOptions(allProducts, {
  categoria: 'blanquería',
  maxPrice: 20000
});
// → { products, total, filters, options }
```

#### 10. **`paginateProducts(products, page, itemsPerPage)`**
Paginación simple
```typescript
const page1 = paginateProducts(filtered, 1, 12);
```

#### 11. **`getPaginationInfo(total, itemsPerPage)`**
Info de paginación para UI
```typescript
const info = getPaginationInfo(total, 12);
// → { totalPages: 4, totalItems: 42, itemsPerPage: 12 }
```

---

## 💡 EJEMPLOS DE USO EN COMPONENTES

### Ejemplo 1: ProductsSection (SIN CAMBIOS VISUALES)

```typescript
'use client';
import { filterProducts, sortProducts } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import ProductCard from './ProductCard';

export default function ProductsSection() {
  // Usar helpers para obtener productos filtrados
  const filtered = filterProducts(allProducts, {
    categoria: 'blanquería',
    inStock: true,
    discountOnly: false
  });

  const sorted = sortProducts(filtered, 'price-asc');

  return (
    <div className="grid grid-cols-3 gap-4">
      {sorted.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Ejemplo 2: Página con componente de filtros (FUTURO)

```typescript
'use client';
import { useState, useMemo } from 'react';
import { filterProducts, getFilterOptions } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import type { ProductFilters } from '@/lib/types';

export default function ShopPage() {
  const [filters, setFilters] = useState<ProductFilters>({});

  // Productos filtrados (recalcular solo cuando cambien filtros)
  const filtered = useMemo(
    () => filterProducts(allProducts, filters),
    [filters]
  );

  // Opciones disponibles (dinámicas basadas en filtros)
  const options = useMemo(
    () => getFilterOptions(filtered),
    [filtered]
  );

  return (
    <div>
      {/* Componente de filtros (a implementar) */}
      <FilterPanel 
        options={options}
        onFilterChange={setFilters}
      />
      
      {/* Grid de productos */}
      <ProductGrid products={filtered} />
    </div>
  );
}
```

---

## 🔄 FLUJO DE DATOS

```
allProducts (estático)
      ↓
filterProducts(products, filters)  ← ENTRADA: criterios
      ↓
   [Validaciones]
   [Aplicar cada filtro]
   [Ordenar si aplica]
      ↓
filtered[] ← SALIDA: productos que cumplen TODOS
```

### Orden de aplicación de filtros:
1. **Búsqueda** (searchQuery)
2. **Categoría** (categoria)
3. **Precio** (minPrice, maxPrice)
4. **Stock** (inStock)
5. **Descuento** (discountOnly)
6. **Tags** (tags)
7. **Ordenamiento** (sortBy)

---

## 🛡️ COMPATIBILIDAD GARANTIZADA

✅ **CERO cambios en:**
- ProductCard.tsx → Sigue recibiendo Product
- ProductCarousel.tsx → Sigue recibiendo Product[]
- ProductsSection.tsx → Sigue funcionando igual
- Página /producto/[slug] → Sin cambios
- Página /categoria/[categoria] → Sin cambios
- Carrito → Sin afectar
- Checkout → Sin afectar
- Componentes Layout → Sin afectar
- CSS/Tailwind → Intacto

**Por qué:** La lógica está en helpers, no en componentes.

---

## 🚀 ESCALABILIDAD A FUTURO

### Phase 1: Frontend (YA LISTO)
- ✅ Filtros combinados
- ✅ Búsqueda local
- ✅ Ordenamiento
- ✅ Paginación

### Phase 2: Backend (ARQUITECTURA YA LISTA)
```typescript
// Cuando tengas DB (Supabase, Firebase, etc):
async function filterProductsFromDB(filters: ProductFilters) {
  // La interfaz ProductFilters es agnóstica
  // Funciona igual para datos locales o remotos
  
  let query = db.select().from('products');
  
  if (filters.categoria) {
    query = query.where('categoria', '=', filters.categoria);
  }
  
  if (filters.maxPrice) {
    query = query.where('price', '<=', filters.maxPrice);
  }
  
  // ... más filtros
  
  return query.execute();
}
```

### Phase 3: Búsqueda avanzada (LISTA PARA CONECTAR)
- Integración con Algolia
- Integración con ElasticSearch
- Búsqueda fuzzy

### Phase 4: Admin Panel
```typescript
// El mismo sistema funciona para admin
const adminFiltered = filterProducts(allProducts, {
  categoria: undefined,      // Ver todas
  inStock: undefined,        // Ver todas
  discountOnly: undefined,   // Ver todas
  sortBy: 'newest'
});
```

---

## 📊 ESTADÍSTICAS Y ANALYTICS

```typescript
const stats = getProductStats(allProducts);

console.log(stats.totalProducts);        // 50
console.log(stats.categoriesCount);      // Map(4) { 'blanquería' => 15, ... }
console.log(stats.priceRange);           // { min: 3990, max: 24999 }
console.log(stats.discountedCount);      // 28
console.log(stats.availableCount);       // 48
console.log(stats.averagePrice);         // 12434
```

---

## 🧪 TESTING PREPARADO

Las funciones son **puras** (no dependencies):

```typescript
// ✅ Fácil de testear
describe('filterProducts', () => {
  it('should filter by price range', () => {
    const result = filterProducts(mockProducts, {
      minPrice: 5000,
      maxPrice: 15000
    });
    expect(result.every(p => p.priceNumber >= 5000)).toBe(true);
  });

  it('should combine multiple filters', () => {
    const result = filterProducts(mockProducts, {
      categoria: 'blanquería',
      inStock: true,
      maxPrice: 20000
    });
    // Verificar que todos cumplen TODOS los criterios
  });
});
```

---

## 📋 CHECKLIST: Qué cambió y qué NO

### ✅ CAMBIOS (necesarios, seguros)
- [ ] `lib/types.ts` - Agregados tipos ProductFilters, FilterOptions, etc
- [ ] `lib/product-utils.ts` - Agregadas 11 nuevas funciones helper

### ✅ SIN CAMBIOS (garantizado)
- [ ] `app/page.tsx` - Funciona igual
- [ ] `app/producto/[slug]/page.tsx` - Funciona igual
- [ ] `components/ProductCard.tsx` - Funciona igual
- [ ] `components/ProductCarousel.tsx` - Funciona igual
- [ ] `components/ProductsSection.tsx` - Funciona igual
- [ ] CSS/Tailwind - Intacto
- [ ] Carrito - Sin afectar
- [ ] Checkout - Sin afectar
- [ ] Rutas dinámicas - Sin cambios
- [ ] Layout - Sin cambios

---

## 🎯 PRÓXIMOS PASOS

1. **Ya implementado**: Lógica centralizada de filtros
2. **Paso 1**: Crear componente UI `FilterPanel` (opcional, tu decides diseño)
3. **Paso 2**: Conectar FilterPanel a páginas que quieras
4. **Paso 3**: Implementar paginación en vistas
5. **Paso 4**: Agregar persistencia en URL (searchParams)
6. **Paso 5**: Migrar a base de datos cuando esté lista

---

## 💻 CÓDIGO PARA COPIAR Y PEGAR

### Test: Verifica que todo funciona

```typescript
// En tu página o componente, prueba esto:
import { filterProducts, getFilterOptions, getProductStats } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';

// Test 1: Filtro simple
const blanqueria = filterProducts(allProducts, { categoria: 'blanquería' });
console.log(`Blanquería: ${blanqueria.length} productos`);

// Test 2: Filtros complejos
const filtered = filterProducts(allProducts, {
  categoria: 'blanquería',
  maxPrice: 20000,
  inStock: true,
  discountOnly: true
});
console.log(`Filtrado: ${filtered.length} productos`);

// Test 3: Opciones para UI
const options = getFilterOptions(filtered);
console.log('Categorías:', options.categories);
console.log('Rango precio:', options.priceRange);

// Test 4: Estadísticas
const stats = getProductStats(allProducts);
console.log('Promedio precio:', stats.averagePrice);
console.log('Con stock:', stats.availableCount);
```

---

## ✨ VENTAJAS DEL SISTEMA

| Característica | Antes | Después |
|---|---|---|
| **Lógica de filtros** | Hardcodeada en componentes | Centralizada en helpers |
| **Reutilización** | Copiar-pegar código | Importar función |
| **Mantenimiento** | Cambiar en 5 lugares | Cambiar en 1 lugar |
| **Escalabilidad** | Difícil | Fácil |
| **Testing** | Difícil | Fácil |
| **Tipado** | Parcial | Estricto |
| **Futuro DB** | Requeriría refactor | Mínimos cambios |

---

## 🎓 CONCEPTOS CLAVE

### 1. **Separación de responsabilidades**
- `types.ts` → Define contratos
- `product-utils.ts` → Implementa lógica
- `ProductCard.tsx` → Solo renderiza

### 2. **Composabilidad**
- Funciones pequeñas que se pueden combinar
- `filterProducts()` es agnóstica, funciona con cualquier array

### 3. **Escalabilidad horizontal**
- Agregar nuevo filtro = agregar 1 condición en `filterProducts()`
- No afecta componentes

### 4. **Single Responsibility Principle**
- Cada función hace 1 cosa bien
- Fácil de entender y testear

---

## 📞 SOPORTE Y DEBUGGING

Si algo no funciona:

1. **Verificar tipos**: `ProductFilters` tiene todos los campos?
2. **Verificar imports**: ¿Estás importando de `lib/product-utils`?
3. **Verificar datos**: ¿`allProducts` tiene datos válidos?
4. **Logging**: `console.log(filterProducts(...))` para debug

---

**Documentación creada:** 19/05/2026
**Versión:** 1.0 - Sistema Base Estable
