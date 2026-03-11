export interface Product {
  id: number;
  name: string;
  price: string;
  discount?: string;
  imageUrl?: string;
  description?: string;
  category?: string;
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
