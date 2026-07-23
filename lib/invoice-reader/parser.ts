import type { InvoiceData, OcrResult } from './types';
import { detectParser } from './parsers/index';

export function parseInvoice(data: OcrResult): InvoiceData {
  const parser = detectParser(data.lines);
  return parser.parse(data);
}
