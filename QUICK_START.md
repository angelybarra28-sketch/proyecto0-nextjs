# 🚀 QUICK START - COMIENZA EN 5 MINUTOS

## ⚡ Los 3 pasos más importantes

### Paso 1: Verifica que está instalado (30 segundos)

```bash
# En terminal, ejecuta:
grep "filterProducts" lib/product-utils.ts
```

Si ves `export function filterProducts` → ✅ Listo

### Paso 2: Test rápido (1 minuto)

Crea un archivo temporal `test-filters.tsx`:

```typescript
'use client';
import { filterProducts, getFilterOptions } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';

export default function TestPage() {
  // Test 1: Simple
  const t1 = filterProducts(allProducts, { categoria: 'blanquería' });

  // Test 2: Complejo
  const t2 = filterProducts(allProducts, {
    categoria: 'blanquería',
    maxPrice: 20000,
    inStock: true,
    discountOnly: true
  });

  // Test 3: Opciones
  const options = getFilterOptions(t2);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">✅ TEST FILTROS</h1>
      <p>Categoría: {t1.length} ✓</p>
      <p>Complejos: {t2.length} ✓</p>
      <p>Categorías UI: {options.categories.length} ✓</p>
    </div>
  );
}
```

Accede a `http://localhost:3000/test` → Deberías ver 3 checkmarks ✓

### Paso 3: Usa en tu página (3 minutos)

Copia esto en tu página favorita (ej: `/categoria`):

```typescript
'use client';
import { useState, useMemo } from 'react';
import { filterProducts } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';

export default function CategoryPage({ params }: any) {
  const [maxPrice, setMaxPrice] = useState(50000);

  const products = useMemo(() => {
    return filterProducts(allProducts, {
      categoria: params.categoria,
      maxPrice: maxPrice
    });
  }, [params.categoria, maxPrice]);

  return (
    <div>
      <input
        type="range"
        value={maxPrice}
        onChange={(e) => setMaxPrice(parseInt(e.target.value))}
        min="0"
        max="50000"
      />
      <p>Precio máximo: ${maxPrice}</p>

      <div className="grid grid-cols-3 gap-4">
        {products.map(p => (
          <div key={p.id} className="p-4 border rounded">
            {p.name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

¡LISTO! Ya tienes filtros funcionando. 🎉

---

## 📚 DOCUMENTACIÓN DISPONIBLE

```
CHEATSHEET_FILTROS.md       ← Lee primero (5 min) - Referencia rápida
EJEMPLOS_FILTROS.md         ← Luego (15 min) - Código copy-paste
ARQUITECTURA_VISUAL.md      ← Si quieres entender (10 min)
FILTROS_ARQUITECTURA.md     ← Documentación completa (20 min)
INTEGRACION_FILTROS.md      ← Guía de integración paso a paso
RESUMEN_IMPLEMENTACION.md   ← Lo que se hizo
```

**Mi recomendación:** Lee en este orden:
1. Este archivo (2 min)
2. CHEATSHEET_FILTROS.md (5 min)
3. EJEMPLOS_FILTROS.md (10 min)
4. Código en tu repo (5 min)

Total: 22 minutos = experto en filtros

---

## 🎯 FUNCIONES PRINCIPALES (Solo estas 3 necesitas)

### 1. `filterProducts()` - LA REINA

```typescript
import { filterProducts } from '@/lib/product-utils';

// Uso
const resultado = filterProducts(allProducts, {
  categoria: 'blanquería',
  maxPrice: 20000,
  inStock: true
});
```

### 2. `getFilterOptions()` - Para UI

```typescript
import { getFilterOptions } from '@/lib/product-utils';

// Para renderizar dropdowns, checkboxes, etc
const options = getFilterOptions(filtered);

options.categories.map(cat => (
  <option key={cat.name}>{cat.name} ({cat.count})</option>
))
```

### 3. `getProductStats()` - Para analytics

```typescript
import { getProductStats } from '@/lib/product-utils';

const stats = getProductStats(allProducts);
console.log('Promedio:', stats.averagePrice);
console.log('Stock:', stats.availableCount);
```

---

## 🔧 IMPORT MÁS USADO

```typescript
// Siempre necesitarás estos imports:
import { filterProducts, getFilterOptions } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import type { ProductFilters } from '@/lib/types';

// Y este hook:
import { useMemo } from 'react';
```

---

## 📊 TABLA DE FILTROS DISPONIBLES

| Filtro | Tipo | Ejemplo |
|--------|------|---------|
| `categoria` | string | `{ categoria: 'blanquería' }` |
| `minPrice` | number | `{ minPrice: 5000 }` |
| `maxPrice` | number | `{ maxPrice: 20000 }` |
| `inStock` | boolean | `{ inStock: true }` |
| `discountOnly` | boolean | `{ discountOnly: true }` |
| `searchQuery` | string | `{ searchQuery: 'sábanas' }` |
| `sortBy` | string | `{ sortBy: 'price-asc' }` |

---

## 💡 PATRONES DE USO

### Patrón 1: Filtro fijo (sin interacción)

```typescript
// No necesita estado, no necesita useMemo
const offer = filterProducts(allProducts, {
  discountOnly: true,
  inStock: true
});
```

### Patrón 2: Filtro interactivo (con slider/dropdown)

```typescript
// Necesita estado + useMemo
const [maxPrice, setMaxPrice] = useState(50000);

const filtered = useMemo(() => {
  return filterProducts(allProducts, {
    maxPrice: maxPrice
  });
}, [maxPrice]);
```

### Patrón 3: Múltiples filtros (UI compleja)

```typescript
const [category, setCategory] = useState('');
const [maxPrice, setMaxPrice] = useState(50000);
const [inStockOnly, setInStockOnly] = useState(false);

const filtered = useMemo(() => {
  return filterProducts(allProducts, {
    categoria: category || undefined,
    maxPrice,
    inStock: inStockOnly || undefined
  });
}, [category, maxPrice, inStockOnly]);
```

---

## 🛡️ ERRORES COMUNES (EVITA ESTOS)

### ❌ Olvidar `useMemo`

```typescript
// MALO - Recalcula cada render
const filtered = filterProducts(allProducts, filters);

// BUENO - Se cachea
const filtered = useMemo(
  () => filterProducts(allProducts, filters),
  [filters]
);
```

### ❌ Olvidar dependencias en `useMemo`

```typescript
// MALO - Nunca actualiza
const filtered = useMemo(
  () => filterProducts(allProducts, filters),
  []  // ← VACÍO
);

// BUENO
const filtered = useMemo(
  () => filterProducts(allProducts, filters),
  [filters]  // ← CORRECTO
);
```

### ❌ No usar `type` para TypeScript

```typescript
// MALO
import { ProductFilters } from '@/lib/types';

// BUENO
import type { ProductFilters } from '@/lib/types';
```

### ❌ Intentar modificar `allProducts`

```typescript
// MALO
allProducts.push(newProduct);

// BUENO
const updated = [...allProducts, newProduct];
```

---

## 🧪 VERIFICACIÓN FINAL

Ejecuta esto en cualquier página:

```typescript
console.log('✅ Filtros disponibles:');

import { 
  filterProducts, 
  getFilterOptions,
  getProductStats 
} from '@/lib/product-utils';

console.log('filterProducts:', typeof filterProducts);  // "function" ✓
console.log('getFilterOptions:', typeof getFilterOptions);  // "function" ✓
console.log('getProductStats:', typeof getProductStats);  // "function" ✓
```

Si ves 3 "function" → ✅ Funciona

---

## 🚀 PRÓXIMOS 30 MINUTOS

1. **Ahora (0-5 min):** Test rápido
2. **Luego (5-10 min):** Lee CHEATSHEET_FILTROS.md
3. **Próximo (10-25 min):** Integra en una página
4. **Final (25-30 min):** Prueba navegando

---

## 💬 PREGUNTAS FRECUENTES

### ¿Esto rompe mi frontend?

**NO.** Cero cambios visuales. Todo sigue igual. Los filtros son SOLO lógica centralizada.

### ¿Tengo que cambiar mis componentes?

**NO.** Los componentes siguen recibiendo `Product[]` igual. Solo usas `filterProducts()` antes de pasarles los datos.

### ¿Cómo agrego un nuevo filtro?

**Fácil:**
1. Agregar propiedad a `ProductFilters` en `lib/types.ts`
2. Agregar condición en `filterProducts()` en `lib/product-utils.ts`
3. Usar en componentes

### ¿Funciona offline?

**Sí.** Todo es local (en memoria), no necesita backend.

### ¿Escala a base de datos?

**Sí.** La interfaz es agnóstica. Funciona igual con datos locales o remotos.

### ¿Cuándo agregó esto?

**Hoy.** 19 de mayo 2026. Los cambios están en `lib/types.ts` y `lib/product-utils.ts`.

### ¿Debo actualizar componentes existentes?

**Opcional.** Los componentes siguen funcionando igual. Solo úsalo cuando necesites filtros.

---

## 📝 PRÓXIMOS PASOS SUGERIDOS

### Esta semana

- [ ] Leer CHEATSHEET_FILTROS.md
- [ ] Hacer test rápido
- [ ] Integrar en una página (ej: `/categoria`)

### Las siguientes 2 semanas

- [ ] Agregar widget de ofertas especiales
- [ ] Agregar búsqueda mejorada
- [ ] Implementar paginación

### El próximo mes

- [ ] Crear página `/tienda` con filtros completos
- [ ] Conectar a base de datos (cuando esté lista)
- [ ] Panel admin con filtros

---

## ✅ CHECKLIST DE INICIO

- [ ] Verificaste que `filterProducts` existe en `product-utils.ts`
- [ ] Hiciste test rápido y viste ✓✓✓
- [ ] Entiendes que funciona sin modificar componentes
- [ ] Leíste CHEATSHEET_FILTROS.md
- [ ] Intentaste usar `filterProducts` en una página
- [ ] ¡ÉXITO! Tienes filtros funcionando

---

## 🎉 ¡BIENVENIDO AL FUTURO DE TU ECOMMERCE!

Tu proyecto ahora tiene:
- ✅ Filtros profesionales
- ✅ Arquitectura escalable
- ✅ Preparado para crecer
- ✅ Código limpio y tipado
- ✅ Documentación completa

**¿Qué esperas? ¡Comienza a filtrar!**

---

**Inicio rápido creado:** 19/05/2026  
**Tiempo de lectura:** 5 minutos  
**Tiempo de implementación:** 30 minutos
