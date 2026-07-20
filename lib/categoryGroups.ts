export const BLANQUERIA_CATEGORIES = [
  'Sábanas',
  'Invierno',
  'Verano',
  'Almohadas',
  'Cortinas',
  'Cocina',
  'Baño',
  'Toallones',
  'Infantil',
  'Batas',
];

export const HOGAR_CATEGORIES = [
  'Bicicletas',
  'TV',
  'Celulares',
  'Climatizacion',
  'Electrodomésticos',
  'Herramientas',
  'Lavado',
  'Jardin',
  'Piletas',
  'Belleza y cuidado personal',
  'Otros',
];

export const PARENT_CATEGORIES: Record<string, { title: string; subcategories: string[] }> = {
  blanqueria: {
    title: 'Blanquería',
    subcategories: BLANQUERIA_CATEGORIES,
  },
  'articulos-del-hogar': {
    title: 'Artículos del hogar',
    subcategories: HOGAR_CATEGORIES,
  },
};
