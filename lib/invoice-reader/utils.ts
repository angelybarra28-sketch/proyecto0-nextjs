import type { OcrLine } from './types';

// TODO v2.0: reemplazar lista fija de patrones por un clasificador online
// que aprenda nuevas presentaciones a partir de las correcciones del usuario.
// Almacenar en localStorage o Supabase y sincronizar entre sesiones.
const PRESENTATION_PATTERNS = [
  /^KING$/i,
  /^QUEEN$/i,
  /^TWIN$/i,
  /^FULL$/i,
  /^1 1\/2 PL$/i,
  /^2 1\/2 PL$/i,
  /^3 1\/2 PL$/i,
  /^1 1\/2$/i,
  /^2 1\/2$/i,
  /^3 1\/2$/i,
  /^\d+\s*X\s*\d+$/i,
  /^\d+\.?\d*\s*M(?:T)?$/i,
  /^\d+\.?\d*\s*CM$/i,
  /^\d+\s*PL$/i,
  /^\d+\/\d+\s*PL$/i,
  /^\d+\.\d+\s*PL$/i,
  /^S\/\s*M$/i,
  /^S\/M$/i,
  /^SIN$/i,
];

const CURRENCY_REGEX = /\$?\s*[\d]{1,3}(?:\.\d{3})*(?:,\d{2})/g;
const DATE_REGEX = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;

export function averageY(bbox: number[]): number {
  let sum = 0;
  for (let i = 1; i < bbox.length; i += 2) {
    sum += bbox[i];
  }
  return sum / (bbox.length / 2);
}

export function groupLinesByRow(lines: OcrLine[], yTolerance = 10): OcrLine[][] {
  if (lines.length === 0) return [];

  const sorted = [...lines].sort((a, b) => averageY(a.bbox) - averageY(b.bbox));

  const rows: OcrLine[][] = [];
  let currentRow: OcrLine[] = [sorted[0]];
  let currentY = averageY(sorted[0].bbox);

  for (let i = 1; i < sorted.length; i++) {
    const y = averageY(sorted[i].bbox);
    if (Math.abs(y - currentY) <= yTolerance) {
      currentRow.push(sorted[i]);
    } else {
      rows.push(currentRow.sort((a, b) => (a.bbox[0] ?? 0) - (b.bbox[0] ?? 0)));
      currentRow = [sorted[i]];
      currentY = y;
    }
  }
  rows.push(currentRow.sort((a, b) => (a.bbox[0] ?? 0) - (b.bbox[0] ?? 0)));

  return rows;
}

export function extractCurrencyValues(text: string): number[] {
  const values: number[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(CURRENCY_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    values.push(normalizeArsPrice(match[0]));
  }
  return values;
}

export function normalizeArsPrice(raw: string): number {
  const cleaned = raw
    .replace(/[$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function isPresentation(text: string): boolean {
  return PRESENTATION_PATTERNS.some((p) => p.test(text.trim()));
}

export function extractDates(text: string): string[] {
  const dates: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(DATE_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    const [, d, m, y] = match;
    const year = y.length === 2 ? `20${y}` : y;
    dates.push(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  }
  return dates;
}

export function isNumeric(text: string): boolean {
  return /^\d+$/.test(text.trim());
}

export function findLeadingNumber(text: string): number | null {
  const match = text.trim().match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
