export const BLANQUERIA_CATEGORIES = [
  'Sábanas',
  'Acolchados',
  'Frazadas',
  'Almohadas',
  'Cubrecamas',
  'Toallones',
  'Mantelería',
];

export const HOGAR_CATEGORIES = [
  'Colchones',
  'Electrodomésticos',
  'Artículos del hogar',
];

export const PARENT_CATEGORIES: Record<string, { title: string; subcategories: string[] }> = {
  blanqueria: {
    title: 'Blanquería',
    subcategories: BLANQUERIA_CATEGORIES,
  },
  electrodomesticos: {
    title: 'Electrodomésticos',
    subcategories: HOGAR_CATEGORIES,
  },
};
