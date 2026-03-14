# Página de Detalles de Producto - Documentación

## 🎯 Características

La página de detalles está completamente desarrollada y funcional con:

✅ **Carrusel de imágenes dinámico**
- Navegación con botones prev/next
- Puntos navegables
- Contador de página actual

✅ **Información del producto**
- Nombre y descripción
- Precio con descuento
- Información de envío

✅ **Especificaciones técnicas**
- Tamaño
- Material
- Firmeza
- Con almohada (Sí/No)
- Color

✅ **Características listadas**
- Listado de features del producto
- Diseño limpio y organizado

✅ **Controles de compra**
- Selector de cantidad
- Botón "Comprar ahora"
- Botón "Agregar al carrito"

## 🔗 Rutas Disponibles

```
/detalles/1   → Primer producto (Kit Cubrecama Premium)
/detalles/2   → Segundo producto (Juego de Sábanas Suave)
/detalles/3   → Tercer producto (Acolchado Deluxe)
... y así sucesivamente hasta /detalles/12
```

## 📁 Estructura de Archivos

```
components/
├── Product/
│   ├── ProductCard.tsx          ← Ahora incluye Link a /detalles/[id]
│   ├── ProductCarousel.tsx      ← Carrusel de imágenes
│   └── ProductInfo.tsx          ← Información y controles

app/
└── detalles/
    └── [id]/
        └── page.tsx             ← Página dinámica de detalles

styles/
└── ProductDetail.module.css     ← Estilos de la página
```

## 🎨 Diseño

**Paleta de colores usada:**
- Fondo: #1E1D1B
- Texto principal: #F5F2EC
- Primario: #4A433A
- Secundario: #D3CDC4
- Verde (envío): #28A745
- Azul (comprar): #2563EB

**Mantiene:**
- La misma línea de diseño del sitio principal
- Responsivo (mobile, tablet, desktop)
- Animaciones suaves

## 📝 Datos de Productos

Cada producto tiene:

```typescript
{
  id: number;
  name: string;
  price: string;           // ej: "$12.999"
  discount?: string;       // ej: "34% OFF"
  imageUrl: string;        // Imagen principal
  carouselImages: string[]; // Array de imágenes para el carrusel
  description: string;     // Descripción breve
  specifications: {
    size: string;
    material: string;
    firmness: string;
    withPillow: string;
    color: string;
  };
  features: string[];      // Array de características
}
```

Para **agregar un nuevo producto**, edita `lib/products.ts` con esta estructura.

## 🖼️ Cómo funciona el carrusel

1. Cada producto tiene un array `carouselImages`
2. Se puede navegar con:
   - Botones ❮ ❯ a los lados
   - Puntos clickeables abajo
   - Muestra el contador "1/3", "2/3", etc.

3. Si el producto tiene solo 1 imagen, no se muestran controles

## 📦 Componentes Reutilizables

### ProductCarousel
```tsx
<ProductCarousel 
  images={product.carouselImages}
  productName={product.name}
/>
```

### ProductInfo
```tsx
<ProductInfo
  name={product.name}
  price={product.price}
  discount={product.discount}
  description={product.description}
  specifications={product.specifications}
  features={product.features}
/>
```

## ✨ Próximas Mejoras

1. Integrar carrito de compras
2. Sistema de reseñas
3. Productos relacionados
4. Calificaciones (sin estrellas, como pediste)
5. Stock disponible
6. Medios de pago
7. Política de devoluciones

## 🚀 Usar en Desarrollo

```bash
npm run dev
```

Navega a cualquier producto desde el catálogo principal y te llevará a `/detalles/[id]`

## 🔍 SEO

Cada página de detalles genera:
- Meta title dinámico
- Meta description
- Open Graph image
- URLs estáticas y optimizadas

---

**Nota:** No se incluyen estrellas de calificación, logos de "más vendido", ni logos superpuestos en las imágenes, como solicitaste.
