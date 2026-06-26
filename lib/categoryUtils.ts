const CATEGORY_ALIASES: Record<string, string[]> = {
  'invierno/abrigo': ['frazadas', 'acolchados', 'edredón', 'edredon', 'invierno-abrigo'],
  'toallas': ['toallones'],
};

export function normalizeCategory(name: string): string {
  const cleaned = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  for (const [canonical, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (canonical === cleaned || aliases.includes(cleaned)) return canonical;
  }
  return cleaned;
}
