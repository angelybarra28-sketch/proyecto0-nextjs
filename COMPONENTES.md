# ElectroBlancos - Tienda de Sábanas y Electrodomésticos

## Estructura de Componentes

```
components/
├── Layout/
│   ├── Header.tsx          # Navegación principal con menú y búsqueda
│   └── Footer.tsx          # Pie de página con enlaces y contacto
├── Sections/
│   ├── BannerCarousel.tsx  # Carrusel de banners principales
│   ├── Hero.tsx            # Sección heroica con CTA
│   ├── ProductsSection.tsx # Sección reutilizable de productos
│   ├── About.tsx           # Información sobre el emprendimiento
│   └── Newsletter.tsx      # Suscripción a newsletter
├── Product/
│   └── ProductCard.tsx     # Tarjeta individual de producto
└── FloatingElements.tsx    # WhatsApp flotante y spinner animado
```

## Estructura de Estilos

Todos los estilos están en `styles/` usando CSS Modules:

```
styles/
├── Header.module.css
├── Footer.module.css
├── BannerCarousel.module.css
├── Hero.module.css
├── ProductCard.module.css
├── ProductsSection.module.css
├── About.module.css
├── Newsletter.module.css
└── FloatingElements.module.css
```

## Cómo Usar

### 1. Ejecutar el proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 2. Agregar imágenes de productos

Coloca las imágenes en la carpeta `public/images/`:

```
public/
└── images/
    ├── banner-1.jpg
    ├── banner-2.jpg
    ├── banner-3.jpg
    ├── sabana-1.webp
    ├── sabana-2.webp
    ├── sabana-3.webp
    ├── producto-1.jpg
    ├── producto-2.jpg
    └── ...
```

### 3. Actualizar datos de productos

Edita el archivo `lib/products.ts` para cambiar:
- Títulos de productos
- Precios
- Descuentos
- URLs de imágenes

```typescript
export const productData = {
  section1: {
    title: 'Tu título aquí',
    products: [
      {
        id: 1,
        name: 'Nombre del producto',
        price: '$XXX',
        discount: '20% OFF', // opcional
        imageUrl: '/images/producto-1.jpg'
      },
      // ...
    ]
  }
}
```

### 4. Personalizar información de contacto

- **Header.tsx**: Enlaces de navegación
- **Footer.tsx**: Teléfono, email, redes sociales
- **FloatingElements.tsx**: Link de WhatsApp

## Características

✅ Diseño responsivo (mobile, tablet, desktop)
✅ Carrusel de banners con transiciones suaves
✅ Búsqueda de productos (funcionalidad base lista)
✅ Animaciones de scroll (reveal)
✅ WhatsApp flotante
✅ Newsletter con validación
✅ Grid de productos dinámico
✅ Spinner 3D animado

## Colores de la Marca

```
Oscuro principal:  #1E1D1B (background)
Texto principal:   #F5F2EC (foreground)
Primario:          #4A433A (botones, nav)
Secundario:        #D3CDC4 (texto secundario)
Rojo descuento:    #D4543B
Verde WhatsApp:    #25D366
```

## Próximos Pasos

1. Agregar lógica de carrito de compras
2. Integrar con base de datos (Supabase, Firebase, etc.)
3. Sistema de autenticación para usuarios
4. Página de detalles de producto
5. Checkout y pagos
6. Sistema de reseñas
7. Admin dashboard para gestionar productos

## Tecnologías Utilizadas

- **Next.js 15** - Framework React
- **TypeScript** - Tipado estático
- **CSS Modules** - Estilos encapsulados
- **React Hooks** - Estado y efectos

## Licencia

Todos los derechos reservados © 2026
