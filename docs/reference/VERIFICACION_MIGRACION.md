# ✅ Checklist de Verificación - Migración a Slugs

## 🧪 Testing Manual

### 1. Verificación de URLs

```bash
# Abre tu navegador y prueba estas URLs:

✅ http://localhost:3000
   → Debe mostrar la página principal
   → ProductCard debe renderizarse correctamente

✅ http://localhost:3000/producto/kit-cubrecama-premium
   → Debe mostrar la página de detalle del producto
   → Breadcrumb "← Volver al catálogo" debe funcionar
   → Las imágenes deben cargar

✅ http://localhost:3000/producto/juego-sabanas-suave
   → Otro producto debe funcionar igual

✅ http://localhost:3000/producto/slug-inexistente
   → Debe mostrar 404 (Not Found)

✅ http://localhost:3000/categoria/blanqueria
   → Categoría debe mostrar todos los productos
   → Los links deben ir a /producto/{slug}

✅ http://localhost:3000/categoria/hogar
   → Otra categoría debe funcionar igual
```

### 2. Verificación de Links

```bash
# En INICIO (http://localhost:3000)

✅ Haz clic en primer producto
   → URL debe cambiar a: /producto/kit-cubrecama-premium
   → Página debe cargar correctamente

✅ Vuelve atrás (botón "← Volver al catálogo")
   → URL debe volver a: /
   → Debe estar en la home

✅ Haz clic en otro producto (ej: segunda sección)
   → URL debe cambiar a: /producto/{slug-del-segundo}
   → Página debe cargar correctamente

✅ Haz clic en categoría desde header
   → URL debe cambiar a: /categoria/{nombre}
   → Debe mostrar lista de productos
   → Cada producto debe tener link a /producto/{slug}

✅ Desde categoría, haz clic en un producto
   → URL debe cambiar a: /producto/{slug}
   → Debe funcionar correctamente

✅ Navegación del carrito
   → El carrito debe seguir funcionando (mantiene productId)
   → Agregar a carrito debe funcionar
   → Ver carrito debe funcionar
```

### 3. Verificación Visual

```bash
# CSS y estilos

✅ ProductCard se ve igual que antes
   → Imagen, nombre, precio, botón
   → Descuentos se muestran correctamente
   → Hover effects funcionan

✅ ProductInfo se ve igual
   → Detalles del producto
   → Especificaciones
   → Features list
   → Botones de carrito

✅ ProductCarousel funciona
   → Imágenes se cargan correctamente
   → Navegación (< >) funciona
   → Dots de indicador funcionan

✅ Layout general sin cambios
   → Header funciona
   → Footer funciona
   → Estilos Tailwind intactos

✅ Responsive en móvil
   → ProductCard se adapta
   → Links clickeables en móvil
   → Carrito accesible
```

### 4. Verificación de TypeScript

```bash
# Terminal

# Compilar proyecto
npm run build

✅ Debe compilar sin errores
✅ Debe compilar sin warnings (si es posible)
✅ No debe haber "any" types inesperados

# Si hay errores, revisar:
# - ¿ProductCard recibe slug?
# - ¿ProductsSection pasa slug?
# - ¿Imports de product-utils son correctos?
```

### 5. Verificación de SEO/Metadata

```bash
# En navegador, ver página de producto

✅ Título del navegador debe ser:
   "Kit Cubrecama Premium | ElectroBlancos"
   (verificar en tab del navegador)

✅ Página debe tener metadata con:
   - title
   - description
   - Open Graph tags (para social media)

# Verificar (Inspector de Chrome > Head):
<title>Kit Cubrecama Premium | ElectroBlancos</title>
<meta name="description" content="Set completo de cubrecama...">
<meta property="og:title" content="Kit Cubrecama Premium">
```

### 6. Verificación de Performance

```bash
# Chrome DevTools > Network

✅ Cuando haces clic en producto:
   - Carga la página /producto/{slug}
   - No debe hacer request adicionales innecesarios

✅ Cuando navegas entre productos:
   - No debe flashear
   - Debe ser suave

✅ generateStaticParams debe haber pre-generado todas las rutas:
   - Build debe mencionar rutas generadas
   - Navegación debe ser instantánea (SSG)
```

---

## 🔧 Checklist Técnico

### Archivos Modificados

```
✅ lib/product-utils.ts (CREADO)
   ├─ getProductBySlug()
   ├─ getProductById()
   ├─ getProductsByCategory()
   ├─ getRelatedProducts()
   ├─ getAllProductSlugs()
   └─ getFeaturedProducts()

✅ components/Product/ProductCard.tsx (ACTUALIZADO)
   ├─ Agregado prop: slug: string
   └─ Link: /producto/{slug}

✅ components/Sections/ProductsSection.tsx (ACTUALIZADO)
   ├─ Interface Product con slug
   └─ Pasa slug a ProductCard

✅ app/producto/[slug]/page.tsx (REFACTORIZADO)
   ├─ Usa getProductBySlug()
   ├─ Usa getAllProductSlugs()
   └─ generateMetadata() funcionando

✅ app/categoria/[categoria]/page.tsx (REFACTORIZADO)
   ├─ Usa getProductsByCategory()
   └─ generateMetadata() actualizado
```

### Archivos No Modificados (Como debe ser)

```
✅ components/Product/ProductCarousel.tsx
   → Sin cambios

✅ components/Product/ProductInfo.tsx
   → Sin cambios (sigue usando productId)

✅ components/Layout/Header.tsx
   → Sin cambios

✅ components/Layout/Footer.tsx
   → Sin cambios

✅ lib/cartContext.ts
   → Sin cambios (mantiene productId)

✅ lib/products.ts
   → Sin cambios en datos
   → Solo agregar nuevos productos con slug

✅ styles/ (todos los CSS)
   → Sin cambios

✅ app/page.tsx
   → Sin cambios en lógica
   → ProductsSection recibe datos con slug automáticamente
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema 1: "ProductCard no recibe slug"
```
Error: Property 'slug' is missing in type 'ProductCardProps'

Solución:
1. Verificar ProductsSection pase slug al ProductCard
2. Verificar que products[] en ProductsSection tengan slug
3. Verificar que allProducts en products.ts tengan slug
```

### Problema 2: Link sigue yendo a /detalles/{id}
```
URL: /detalles/1 en lugar de /producto/kit-cubrecama

Solución:
1. Verificar ProductCard.tsx línea 28:
   href={`/producto/${slug}`}
2. Asegurarse que slug está siendo pasado correctamente
3. Limpiar caché del navegador (Ctrl+Shift+Del)
```

### Problema 3: Página de producto 404
```
Error 404 en /producto/kit-cubrecama-premium

Soluciones:
1. Verificar slug existe en products.ts
2. Verificar slug coincide exactamente (lowercase)
3. Verificar generateStaticParams() se ejecutó en build
4. Limpiar .next/ folder:
   rm -rf .next
   npm run build
```

### Problema 4: TypeScript error "Type 'x' is not assignable"
```
Error: Type 'Product' from product-utils is not compatible

Solución:
1. Asegurarse que Product interface en ProductsSection
   tiene todos los campos de Product en product-utils
2. Agregar slug: string a interfaces locales
```

---

## 📊 Performance Checklist

```bash
# Ejecutar en terminal:

# 1. Build time
npm run build

✅ Debe completar sin errores
✅ Debe mostrar cantidad de rutas pre-generadas
   Ej: "Generated 50 routes"

# 2. Tamaño del bundle
# Output de "npm run build" debe mostrar tamaño

✅ Debe ser similar a antes (sin cambios visuales)

# 3. Dev server
npm run dev

✅ Debe iniciar en ~2-3 segundos
✅ Navegación debe ser instantánea

# 4. Production build size
npm run build
# Ver carpeta .next/static/

✅ Cambio mínimo en tamaño total
```

---

## 🔍 Debug Helpers

### Ver todos los productos disponibles
```javascript
// En Chrome DevTools Console (en cualquier página)

// Necesitas hacer import (copiar desde código):
// const { allProducts } = await import('/__/products.js');

// O simplemente abre app/page.tsx y agrega:
console.table(allProducts.map(p => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  categoria: p.categoria
})));
```

### Verificar que helper funciona
```typescript
// En app/producto/[slug]/page.tsx, agregar:

import { getProductBySlug } from '@/lib/product-utils';

export default async function Page({ params }: Props) {
  const { slug } = await params;
  
  console.log('=== DEBUG INFO ===');
  console.log('Slug recibido:', slug);
  
  const product = getProductBySlug(slug);
  
  console.log('Producto encontrado:', product?.name);
  console.log('====== FIN ======');
  
  // ... resto del código
}

// Ver logs en terminal (dev server)
```

### Verificar URLs en sitemap
```javascript
// Agregar en lib/product-utils.ts temporalmente:

export function generateSitemapUrls(): string[] {
  return allProducts.map(p => `/producto/${p.slug}`);
}

// Luego en componente o página:
import { generateSitemapUrls } from '@/lib/product-utils';

console.table(generateSitemapUrls());
// Verás todas las URLs que se generan
```

---

## ✅ Testing Definitivo

### Test #1: Homepage
```
PASO 1: npm run dev
PASO 2: Abre http://localhost:3000
RESULTADO ESPERADO:
  ✅ Página carga correctamente
  ✅ Ver secciones de productos
  ✅ ProductCard renderiza bien
  ✅ Clics navegan a /producto/{slug}
```

### Test #2: Página de Producto
```
PASO 1: Haz clic en un producto desde homepage
RESULTADO ESPERADO:
  ✅ URL cambia a /producto/{slug-correcto}
  ✅ Página carga contenido correcto
  ✅ Imagen(es) cargan
  ✅ Especificaciones visibles
  ✅ Botones de carrito funcionan
  ✅ Navegación sin errores
```

### Test #3: Categorías
```
PASO 1: Haz clic en categoría del header
RESULTADO ESPERADO:
  ✅ URL cambia a /categoria/{nombre}
  ✅ Productos de esa categoría se muestran
  ✅ Cada producto es clickeable
  ✅ Navega a /producto/{slug}
```

### Test #4: Carrito
```
PASO 1: En página de producto, agregar a carrito
RESULTADO ESPERADO:
  ✅ Producto se agrega al carrito
  ✅ Contador de carrito aumenta
  ✅ Ir a checkout funciona
  ✅ Carrito muestra el producto correcto
```

### Test #5: 404
```
PASO 1: Abre manualmente: /producto/slug-inexistente
RESULTADO ESPERADO:
  ✅ Página 404 se muestra
  ✅ No hay errores en consola
  ✅ Link "volver" funciona
```

### Test #6: Build/Production
```
PASO 1: npm run build
RESULTADO ESPERADO:
  ✅ Build completado sin errores
  ✅ "Generated 50 routes" (o similar)
  ✅ Sin warnings de TypeScript

PASO 2: npm run start (o vercel deploy)
RESULTADO ESPERADO:
  ✅ Servidor inicia
  ✅ URLs están disponibles instantáneamente (SSG)
  ✅ Navegación es rápida
```

---

## 📝 Matriz de Verificación Final

| Aspecto | Status | Notas |
|---------|--------|-------|
| URLs funcionan (/producto/{slug}) | ✅ | |
| TypeScript compila | ✅ | |
| ProductCard recibe slug | ✅ | |
| ProductsSection pasa slug | ✅ | |
| Página detalle funciona | ✅ | |
| Página categoría funciona | ✅ | |
| SEO metadata genera | ✅ | |
| Carrito mantiene productId | ✅ | |
| CSS sin cambios | ✅ | |
| Performance igual | ✅ | |
| Build sin errores | ✅ | |
| No hay console errors | ✅ | |

---

## 🎉 Migración Completada

Si todas las verificaciones pasan: ✅ **LISTO PARA PRODUCCIÓN**

```
✅ Arquitectura migrada
✅ URLs SEO-friendly
✅ Código escalable
✅ Todo funciona como antes (+ mejor)
✅ Preparado para base de datos futura
```

**Siguiente:** Lee `../guides/GUIA_PRACTICA_SLUGS.md` para ejemplos avanzados
