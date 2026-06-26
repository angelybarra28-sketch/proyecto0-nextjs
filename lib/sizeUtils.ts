const SIZE_ALIAS_MAP: Record<string, string[]> = {
  '1 1/2': ['twin', '1/2', 'individual', 'plaza 1/2'],
};

function normalizeRaw(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s*(?:plaza|plz|plazas)\s*/gi, '')
    .trim();
}

export function normalizeSize(raw: string): string {
  const cleaned = normalizeRaw(raw);
  for (const [canonical, aliases] of Object.entries(SIZE_ALIAS_MAP)) {
    if (normalizeRaw(canonical) === cleaned) return canonical;
    if (aliases.some(a => normalizeRaw(a) === cleaned)) return canonical;
  }
  return cleaned;
}

export function getSizeAliases(size: string): string[] {
  const cleaned = normalizeRaw(size);
  for (const [canonical, aliases] of Object.entries(SIZE_ALIAS_MAP)) {
    if (normalizeRaw(canonical) === cleaned) return [canonical, ...aliases];
    if (aliases.some(a => normalizeRaw(a) === cleaned)) return [canonical, ...aliases];
  }
  return [size];
}

