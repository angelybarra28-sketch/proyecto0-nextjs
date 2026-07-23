export interface OcrLine {
  text: string;
  confidence: number;
  bbox: number[];
}

export interface OcrResult {
  text: string;
  lines: OcrLine[];
  raw: unknown;
}

export interface InvoiceItem {
  cantidad: number;
  descripcion: string;
  presentacion: string;
  precioUnitario: number;
  subtotal: number;
}

export interface InvoiceData {
  proveedor?: string;
  fecha?: string;
  numeroFactura?: string;
  total?: number;
  cantidadTotalUnidades?: number;
  observaciones?: string;
  items: InvoiceItem[];
  rawText: string;
}

export interface FacturaParser {
  detect(lines: OcrLine[]): boolean;
  parse(data: OcrResult): InvoiceData;
}
