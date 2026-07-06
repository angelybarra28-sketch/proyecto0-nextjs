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

export const HOGAR_CATEGORIES: string[] = [];

export const PARENT_CATEGORIES: Record<string, { title: string; subcategories: string[] }> = {
  blanqueria: {
    title: 'Blanquería',
    subcategories: BLANQUERIA_CATEGORIES,
  },
};
