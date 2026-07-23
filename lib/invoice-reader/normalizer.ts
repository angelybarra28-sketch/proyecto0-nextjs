import type { InvoiceData, OcrResult } from './types';
import { extractCurrencyValues, normalizeArsPrice, extractDates } from './utils';
// TODO v2.0: reemplazar extractores basados en regex por llamadas a un LLM
// para extraer fecha, proveedor, total y N° de factura con mayor precisión.
// Mantener los extractores actuales como fallback cuando la IA no esté disponible.

export function normalizeInvoiceData(data: InvoiceData): InvoiceData {
  return {
    ...data,
    items: data.items.map((item) => ({
      cantidad: Math.max(1, Math.round(item.cantidad)),
      descripcion: item.descripcion.trim(),
      presentacion: (item.presentacion ?? '').trim(),
      precioUnitario: Math.max(0, item.precioUnitario),
      subtotal: Math.max(0, item.subtotal),
    })),
  };
}

export function tryExtractTotal(text: string): number | undefined {
  const lower = text.toLowerCase();
  const totalMatch = lower.match(/total[^$\n]*\$?\s*([\d]{1,3}(?:\.\d{3})*(?:,\d{2}))/);
  if (totalMatch) {
    return normalizeArsPrice(totalMatch[1]);
  }
  const values = extractCurrencyValues(text);
  return values.length > 0 ? values[values.length - 1] : undefined;
}

export function tryExtractFacturaNumero(text: string): string | undefined {
  const match = text.match(/(?:factura|nro|n°|número|numero)\s*[:\s]*(\d+)/i);
  return match ? match[1] : undefined;
}

export function tryExtractFecha(text: string): string | undefined {
  const dates = extractDates(text);
  return dates.length > 0 ? dates[0] : undefined;
}

export function tryExtractProveedor(lines: { text: string }[]): string | undefined {
  for (const line of lines) {
    const t = line.text.trim();
    if (
      t.length > 2 &&
      t.length < 80 &&
      !/^\d/.test(t) &&
      !t.toLowerCase().includes('factura') &&
      !t.toLowerCase().includes('total') &&
      !t.toLowerCase().includes('cuit') &&
      !t.toLowerCase().includes('iva') &&
      !t.toLowerCase().includes('domicilio') &&
      !t.toLowerCase().includes('condicion') &&
      !t.toLowerCase().includes('telefono') &&
      !/\$\s*[\d]/.test(t)
    ) {
      return t;
    }
  }
  return undefined;
}

export function enrichFromText(data: InvoiceData, ocrData: OcrResult): InvoiceData {
  const text = ocrData.text;

  if (!data.fecha) {
    const f = tryExtractFecha(text);
    if (f) data.fecha = f;
  }

  if (!data.numeroFactura) {
    const nf = tryExtractFacturaNumero(text);
    if (nf) data.numeroFactura = nf;
  }

  if (data.total === undefined || data.total === 0) {
    const t = tryExtractTotal(text);
    if (t) data.total = t;
  }

  if (!data.proveedor) {
    const p = tryExtractProveedor(ocrData.lines);
    if (p) data.proveedor = p;
  }

  return data;
}

export function recomputeSubtotals(items: InvoiceData['items']): InvoiceData['items'] {
  return items.map((item) => ({
    ...item,
    subtotal: item.cantidad * item.precioUnitario,
  }));
}

export function recomputeTotal(items: InvoiceData['items']): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0);
}
