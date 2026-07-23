import type { FacturaParser, InvoiceData, OcrLine, OcrResult } from '../types';
import { findLeadingNumber, extractCurrencyValues, isPresentation } from '../utils';
// TODO v2.0: implementar GenericParser basado en ML que use embeddings de texto
// para identificar cantidad, descripción, presentación, PU y subtotal sin depender
// de la posición fija de los valores monetarios en la línea.

export class GenericParser implements FacturaParser {
  detect(_lines: OcrLine[]): boolean {
    return true;
  }

  parse(data: OcrResult): InvoiceData {
    const items = this.parseItems(data.text);
    const rawText = data.text;

    return {
      items,
      rawText,
    };
  }

  private isHeaderOrFooter(text: string): boolean {
    const lower = text.toLowerCase();
    return (
      lower.includes('total') ||
      lower.includes('subtotal') ||
      lower.includes('factura') ||
      lower.includes('cuit') ||
      lower.includes('iva') ||
      lower.includes('domicilio') ||
      lower.includes('condicion') ||
      lower.includes('telefono') ||
      lower.includes('email') ||
      lower.includes('www')
    );
  }

  private parseItems(text: string): InvoiceData['items'] {
    const lines = text.split('\n').filter((l) => l.trim());
    const items: InvoiceData['items'] = [];

    for (const line of lines) {
      if (this.isHeaderOrFooter(line)) continue;
      const valores = extractCurrencyValues(line);
      if (valores.length < 2) continue;

      const precioUnitario = valores[valores.length - 2];
      const subtotal = valores[valores.length - 1];
      const cantidad = findLeadingNumber(line) ?? 1;

      let resto = line.trim();
      resto = resto.replace(/^\d+\s*/, '');
      const ultimoValorStr = valores.length > 0
        ? this.extractLastCurrencyString(line)
        : '';
      if (ultimoValorStr) {
        const parts = resto.split(ultimoValorStr);
        resto = parts[0]?.trim() ?? '';
      }

      const tokens = resto.split(/\s+/);
      let presentacion = '';
      let descripcion = tokens.join(' ');

      for (let i = tokens.length - 1; i >= 0; i--) {
        const candidate = tokens.slice(i).join(' ');
        if (isPresentation(candidate)) {
          presentacion = candidate;
          descripcion = tokens.slice(0, i).join(' ');
          break;
        }
      }

      items.push({
        cantidad,
        descripcion: descripcion.trim(),
        presentacion: presentacion.trim(),
        precioUnitario,
        subtotal,
      });
    }

    return items;
  }

  private extractLastCurrencyString(line: string): string {
    const match = line.match(/\$?\s*[\d]{1,3}(?:\.\d{3})*(?:,\d{2})\s*$/);
    return match ? match[0].trim() : '';
  }
}
