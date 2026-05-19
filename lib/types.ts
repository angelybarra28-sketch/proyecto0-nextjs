export interface Product {
  id: number;
  name: string;
  price: string;
  priceNumber: number;
  discount?: string;
  imageUrl?: string;
  carouselImages?: string[];
  description?: string;
  slug: string;
  categoria: string;
  stock: number;
  destacado: boolean;
  category?: string;
  specifications?: {
    size: string;
    material: string;
    firmness: string;
    withPillow: string;
    color: string;
  };
  features?: string[];
}

export interface ProductSection {
  title: string;
  products: Product[];
}

export interface NavLink {
  label: string;
  href: string;
  submenu?: NavLink[];
}

export interface ContactInfo {
  phone: string;
  email: string;
  whatsapp: string;
  address?: string;
}

// Tipos para autenticación de usuarios
export interface User {
  id: string;
  dni: string;
  nombreApellido: string;
  telefono: string;
  email: string;
  domicilio: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

// ========================================
// TIPOS PARA SISTEMA DE FILTROS PROFESIONAL
// ========================================

/**
 * Interfaz para filtros de productos
 * Todos los campos son OPCIONALES para máxima flexibilidad
 * Permite filtros individuales o combinados
 */
export interface ProductFilters {
  // Filtros básicos
  categoria?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  discountOnly?: boolean;
  tags?: string[];
  
  // Filtros avanzados (futuros)
  searchQuery?: string;
  sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'popularity';
  page?: number;
  limit?: number;
}

/**
 * Opciones disponibles para UI de filtros
 * Contiene valores únicos y conteos para dropdowns/checkboxes
 */
export interface FilterOptions {
  categories: Array<{
    name: string;
    count: number;
  }>;
  priceRange: {
    min: number;
    max: number;
    step?: number;
  };
  discountPercentages: number[];
  tags: Array<{
    name: string;
    count: number;
  }>;
  totalProducts: number;
  filteredProducts: number;
}

/**
 * Resultado de búsqueda con filtros aplicados
 * Útil para UI que muestra resultados y opciones actualizadas
 */
export interface FilteredProductsResult {
  products: Product[];
  total: number;
  filters: ProductFilters;
  options: FilterOptions;
}

/**
 * Estadísticas de productos para cache y analytics
 */
export interface ProductStats {
  totalProducts: number;
  categoriesCount: Map<string, number>;
  priceRange: { min: number; max: number };
  discountedCount: number;
  availableCount: number;
  averagePrice: number;
  tagFrequency: Map<string, number>;
}
