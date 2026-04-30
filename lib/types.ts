export interface Product {
  id: number;
  name: string;
  price: string;
  discount?: string;
  imageUrl?: string;
  carouselImages?: string[];
  description?: string;
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
