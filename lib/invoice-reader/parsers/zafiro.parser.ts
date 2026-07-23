import type { FacturaParser, InvoiceData, OcrLine, OcrResult } from '../types';
import { extractCurrencyValues, isPresentation, groupLinesByRow } from '../utils';
import { enrichFromText, normalizeInvoiceData } from '../normalizer';

const ZAFIRO_KEYWORDS = ['zafiro', 'ac02', 'ross relax', 'corderito'];

export class ZafiroParser implements FacturaParser {
  detect(lines: OcrLine[]): boolean {
    const text = lines.map((l) => l.text.toLowerCase()).join(' ');
    return ZAFIRO_KEYWORDS.some((kw) => text.includes(kw));
  }

  parse(data: OcrResult): InvoiceData {
    const rows = groupLinesByRow(data.lines, 12);

    const itemRows = this.filterItemRows(rows);
    const items = itemRows.map((row) => this.parseItemRow(row));

    const rawText = data.text;
    let result: InvoiceData = {
      items,
      rawText,
    };

    result = enrichFromText(result, data);
    result = normalizeInvoiceData(result);

    result.cantidadTotalUnidades = result.items.reduce(
      (sum, item) => sum + item.cantidad,
      0,
    );

    return result;
  }

  private filterItemRows(rows: OcrLine[][]): OcrLine[][] {
    return rows.filter((row) => {
      const text = row.map((l) => l.text).join(' ').trim();
      if (!text) return false;
      if (text.toLowerCase().includes('total')) return false;
      if (text.toLowerCase().includes('subtotal')) return false;
      if (text.toLowerCase().includes('factura')) return false;
      if (text.toLowerCase().includes('cuit')) return false;
      if (text.toLowerCase().includes('iva')) return false;
      if (text.toLowerCase().includes('domicilio')) return false;
      if (text.toLowerCase().includes('condicion')) return false;
      if (text.toLowerCase().includes('telefono')) return false;
      if (text.toLowerCase().includes('email')) return false;
      if (text.toLowerCase().includes('www')) return false;

      const currencyValues = extractCurrencyValues(text);
      return currencyValues.length >= 2;
    });
  }

  private parseItemRow(row: OcrLine[]): InvoiceData['items'][number] {
    const text = row.map((l) => l.text).join(' ').trim();
    return this.parseLine(text);
  }

  private parseLine(line: string): InvoiceData['items'][number] {
    const valores = extractCurrencyValues(line);
    const precioUnitario = valores.length >= 2 ? valores[valores.length - 2] : 0;
    const subtotal = valores.length >= 2 ? valores[valores.length - 1] : 0;

    const cantidadMatch = line.trim().match(/^(\d+)/);
    const cantidad = cantidadMatch ? parseInt(cantidadMatch[1], 10) : 1;

    let remaining = line.trim();
    remaining = remaining.replace(/^\d+\s*/, '');

    const allCurrencyStr = this.extractAllCurrencyPortions(line);
    for (const curr of allCurrencyStr) {
      remaining = remaining.replace(curr, '');
    }
    remaining = remaining.replace(/\s+/g, ' ').trim();

    const tokens = remaining.split(/\s+/);
    let presentacion = '';
    let descripcion = tokens.join(' ');

    for (let i = 0; i < tokens.length; i++) {
      const candidate = tokens.slice(i).join(' ');
      if (isPresentation(candidate)) {
        presentacion = candidate;
        descripcion = tokens.slice(0, i).join(' ');
        break;
      }
    }

    return {
      cantidad,
      descripcion: descripcion.trim(),
      presentacion: presentacion.trim(),
      precioUnitario,
      subtotal,
    };
  }

  private extractAllCurrencyPortions(line: string): string[] {
    const portions: string[] = [];
    const regex = /\$?\s*[\d]{1,3}(?:\.\d{3})*(?:,\d{2})/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      portions.push(match[0]);
    }
    return portions;
  }
}
