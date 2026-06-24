# Guía Práctica: Usar y Extender el Sistema de Slugs

## 🎯 Casos de Uso Comunes

### 1. Obtener un producto específico
```typescript
import { getProductBySlug } from '@/lib/product-utils';

// Obtener en una página/componente
const product = getProductBySlug('kit-cubrecama-premium');

if (product) {
  console.log(product.name);        // "Kit Cubrecama Premium"
  console.log(product.price);       // "$12.999"
  console.log(product.categoria);   // "blanquería"
}
```

### 2. Obtener todos los productos de una categoría
```typescript
import { getProductsByCategory } from '@/lib/product-utils';

// Obtener en una página de categoría
const blanqueriaProducts = getProductsByCategory('blanquería');

console.log(blanqueriaProducts.length);  // 6 productos
blanqueriaProducts.forEach(p => {
  console.log(p.name);  // Imprime cada nombre
});
```

### 3. Obtener productos relacionados
```typescript
import { getRelatedProducts } from '@/lib/product-utils';

// En la página de detalle, mostrar productos similares
const relatedProducts = getRelatedProducts(
  'kit-cubrecama-premium',  // slug actual
  4                          // máximo 4 relacionados
);

// Renderizar estas en una galería inferior
```

### 4. Obtener todos los slugs (para SEO/sitemap)
```typescript
import { getAllProductSlugs } from '@/lib/product-utils';

// Generar rutas estáticas
export async function generateStaticParams() {
  return getAllProductSlugs();
  // Resultado: [{ slug: 'kit-cubrecama-premium' }, { slug: 'juego-sabanas-suave' }, ...]
}

// O generar sitemap
const slugs = getAllProductSlugs();
const urls = slugs.map(s => `https://tudominio.com/producto/${s.slug}`);
```

### 5. Obtener solo productos destacados
```typescript
import { getFeaturedProducts } from '@/lib/product-utils';

// En homepage, mostrar destacados
const featured = getFeaturedProducts();

console.log(featured.length);  // Varía según datos
featured.forEach(p => {
  console.log(`${p.name} - ${p.discount}`);
});
```

---

## 🆕 Agregar Nuevas Funciones Helper

### Caso 1: Buscar por precio rango
```typescript
// En lib/product-utils.ts, agregar:

export function getProductsByPriceRange(
  minPrice: number,
  maxPrice: number
): Product[] {
  return allProducts.filter(p => {
    const price = p.priceNumber;
    return price >= minPrice && price <= maxPrice;
  });
}

// Uso:
const affordableProducts = getProductsByPriceRange(3000, 10000);
```

### Caso 2: Búsqueda por palabra clave
```typescript
// En lib/product-utils.ts, agregar:

export function searchProducts(query: string): Product[] {
  const lowerQuery = query.toLowerCase();
  
  return allProducts.filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery) ||
    p.slug.toLowerCase().includes(lowerQuery)
  );
}

// Uso:
const results = searchProducts('sábana');
// Devuelve todos los productos con "sábana" en nombre/descripción
```

### Caso 3: Productos en descuento
```typescript
// En lib/product-utils.ts, agregar:

export function getDiscountedProducts(): Product[] {
  return allProducts.filter(p => p.discount !== undefined);
}

// Uso:
const withDiscount = getDiscountedProducts();
console.log(`${withDiscount.length} productos en promoción`);
```

### Caso 4: Productos por rango de stock
```typescript
// En lib/product-utils.ts, agregar:

export function getLowStockProducts(threshold: number = 20): Product[] {
  return allProducts.filter(p => p.stock && p.stock <= threshold);
}

// Uso:
const needsRestock = getLowStockProducts(10);
// Panel admin: "¡10 productos con stock bajo!"
```

---

## 🔌 Integración con Componentes

### Uso en un componente cliente
```typescript
// components/RelatedProducts.tsx
'use client';

import { getRelatedProducts } from '@/lib/product-utils';
import ProductCard from './Product/ProductCard';

interface RelatedProductsProps {
  currentProductSlug: string;
}

export default function RelatedProducts({ 
  currentProductSlug 
}: RelatedProductsProps) {
  // ⚠️ CUIDADO: Esto es componente cliente
  // getRelatedProducts() es función síncrona (array)
  // Esto funciona bien con arrays estáticos
  
  const related = getRelatedProducts(currentProductSlug, 4);
  
  return (
    <div className="related-products">
      {related.map(product => (
        <ProductCard 
          key={product.slug}
          slug={product.slug}
          name={product.name}
          price={product.price}
          imageUrl={product.imageUrl}
          productId={product.id}
          discount={product.discount}
          productIndex={0}
        />
      ))}
    </div>
  );
}
```

### Uso en una página servidor
```typescript
// app/producto/[slug]/layout.tsx (futuro)
import { getRelatedProducts } from '@/lib/product-utils';

export default async function ProductLayout({ 
  children,
  params 
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const related = getRelatedProducts(slug, 3);
  
  return (
    <div>
      {children}
      
      {/* Sidebar con relacionados */}
      <aside className="sidebar">
        <h3>También te puede interesar</h3>
        {/* Renderizar related aquí */}
      </aside>
    </div>
  );
}
```

---

## 📊 Migrando a Base de Datos

### Paso 1: Identificar qué cambiar
```typescript
// ANTES (array estático)
export function getProductBySlug(slug: string): Product | undefined {
  return allProducts.find(p => p.slug === slug);
}

// DESPUÉS (Supabase)
export async function getProductBySlug(
  slug: string
): Promise<Product | undefined> {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single()
    .throwOnError();
    
  return data as Product;
}
```

### Paso 2: Actualizar páginas que lo usan
```typescript
// app/producto/[slug]/page.tsx
// Antes:
const product = getProductBySlug(slug);

// Después (automático - ya espera Promise):
const product = await getProductBySlug(slug);

// ✅ El rest de la página no cambia!
```

### Paso 3: Testing
```typescript
// Ambas versiones funcionan igual
const product = await getProductBySlug('kit-cubrecama-premium');

// El resultado es idéntico:
// { id: 1, slug: 'kit-cubrecama-premium', name: '...', ... }
```

---

## 🧪 Testing

### Test de helpers
```typescript
// lib/__tests__/product-utils.test.ts
import { 
  getProductBySlug,
  getProductsByCategory,
  getRelatedProducts 
} from '../product-utils';

describe('Product Utils', () => {
  it('debe encontrar producto por slug', () => {
    const product = getProductBySlug('kit-cubrecama-premium');
    expect(product).toBeDefined();
    expect(product?.name).toBe('Kit Cubrecama Premium');
  });

  it('debe devolver undefined para slug inexistente', () => {
    const product = getProductBySlug('producto-inexistente');
    expect(product).toBeUndefined();
  });

  it('debe filtrar por categoría', () => {
    const blanqueria = getProductsByCategory('blanquería');
    expect(blanqueria.length).toBeGreaterThan(0);
    blanqueria.forEach(p => {
      expect(p.categoria).toBe('blanquería');
    });
  });

  it('debe obtener relacionados sin el actual', () => {
    const related = getRelatedProducts('kit-cubrecama-premium');
    expect(related).not.toContainEqual(
      expect.objectContaining({ slug: 'kit-cubrecama-premium' })
    );
  });
});
```

---

## 🔍 Debugging

### Ver todos los slugs disponibles
```typescript
// Abre devtools console en página de inicio
// Copia esto:

import { getAllProductSlugs } from '@/lib/product-utils';
console.table(getAllProductSlugs());

// Verás tabla con todos los slugs
```

### Verificar que slug existe
```typescript
// app/producto/[slug]/page.tsx - agregar log temporal

const product = getProductBySlug(slug);

console.log('Slug buscado:', slug);
console.log('Producto encontrado:', product?.name);

if (!product) {
  console.warn('Producto no encontrado. Slugs disponibles:');
  console.table(getAllProductSlugs());
  notFound();
}
```

### Performance profiling
```typescript
// lib/product-utils.ts - versión con timing

export function getProductBySlug(slug: string): Product | undefined {
  const start = performance.now();
  const result = allProducts.find(p => p.slug === slug);
  const end = performance.now();
  
  console.log(`⏱️ getProductBySlug(${slug}): ${(end - start).toFixed(2)}ms`);
  
  return result;
}

// Con 50 productos: ~0.05ms
// Con 10,000 productos: ~2ms
// Con BD: ~0.5ms + latencia de red
```

---

## 📋 Checklist para Agregar Nuevo Producto

Cuando agregues un nuevo producto a `lib/products.ts`:

```typescript
{
  id: 99,                                    // ✅ Único incrementado
  slug: 'nuevo-producto-slug',               // ✅ Único, lowercase, con-guiones
  name: 'Nuevo Producto',                    // ✅ Nombre visible
  categoria: 'blanquería',                   // ✅ Categoría existente
  price: '$9.999',                           // ✅ Formato
  priceNumber: 9999,                         // ✅ Para cálculos
  imageUrl: '/images/producto.webp',         // ✅ Archivo existe
  carouselImages: [...],                     // ✅ URLs válidas
  description: '...',                        // ✅ SEO keywords
  specifications: { ... },                   // ✅ Todos los campos
  features: [...],                           // ✅ Lista de beneficios
  stock: 20,                                 // ✅ Stock inicial
  destacado: false,                          // ✅ default false
  discount: '10% OFF'                        // ✅ Opcional
}
```

**Test:**
```typescript
// Terminal
npm run build

// Debe haber un error de tipo o compilar correctamente
// Si compila: ✅ Nuevo producto listo

// En navegador
// Ir a: http://localhost:3000/producto/nuevo-producto-slug
// Debe mostrar la página correctamente
```

---

## 🎓 Mejores Prácticas

### ✅ DO - Lo correcto
```typescript
// 1. Siempre usar helpers
const product = getProductBySlug(slug);

// 2. Centralizar lógica en product-utils.ts
export function getAllProductsInStock() {
  return allProducts.filter(p => p.stock > 0);
}

// 3. Type-safe
const product: Product | undefined = getProductBySlug(slug);

// 4. Validar entrada
if (!slug) return undefined;

// 5. Documentar funciones
/**
 * Obtiene productos por categoría (case-insensitive)
 * @param categoria - Nombre de la categoría
 * @returns Array de productos o empty array
 */
export function getProductsByCategory(categoria: string): Product[] {
```

### ❌ DON'T - Lo incorrecto
```typescript
// 1. Nunca buscar directamente en allProducts
const product = allProducts.find(p => p.slug === slug);

// 2. No duplicar lógica en varios archivos
// Copia-pega de búsquedas

// 3. No ignorar tipos
const product: any = getProductBySlug(slug);

// 4. No asumir datos válidos
getProductBySlug(slug) // ¿Qué si slug es undefined?

// 5. Sin documentación
export function xyz() { ... }
```

---

## 📞 FAQ Técnico

**P: ¿Puedo usar getProductBySlug() en componente cliente?**
A: Sí, mientras sea array (función síncrona). Con BD async necesitarás suspense.

**P: ¿Qué pasa si dos productos tienen el mismo slug?**
A: `find()` devuelve el primero. En BD, agregar `UNIQUE` constraint.

**P: ¿Cómo manejo accents en slugs?**
A: Usuarios escriben "Sabanas" → generas slug "sabanas" sin acento.

**P: ¿Puedo cambiar un slug?**
A: Sí, pero rompe URLs viejas. Agregar redirect 301 para SEO.

**P: ¿Necesito caché?**
A: Array estático → no. BD con 10k productos → sí, agregar Redis.

---

**Siguiente paso:** Abre `RESUMEN_MIGRACION.md` para testing ✅
