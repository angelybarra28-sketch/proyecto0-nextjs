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
  'Otros',
];

export const PARENT_CATEGORIES: Record<string, { title: string; subcategories: string[] }> = {
  blanqueria: {
    title: 'Blanquería',
    subcategories: BLANQUERIA_CATEGORIES,
  },
};
