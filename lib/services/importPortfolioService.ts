import * as xlsx from 'xlsx';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ImportPortfolioPreview,
  ImportPortfolioResult,
  ImportPortfolioRow,
  ImportPortfolioPayment,
  ImportValidationError,
  ImportValidationWarning,
} from '@/lib/types';
import { importPortfolioRow } from '@/lib/repositories/creditAccountRepository';

const MONTH_MAP: Record<string, number> = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
};

function normalizeHeader(h: string): string {
  return h.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
}

function detectMonthColumn(header: string): { month: number; year?: number } | null {
  const normalized = normalizeHeader(header);
  const matchWithYear = normalized.match(/^(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)_(\d{4})$/);
  if (matchWithYear) {
    const month = MONTH_MAP[matchWithYear[1]];
    if (month) return { month, year: Number(matchWithYear[2]) };
  }
  const matchWithoutYear = normalized.match(/^(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)$/);
  if (matchWithoutYear) {
    const month = MONTH_MAP[matchWithoutYear[1]];
    if (month) return { month };
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

function getYearFromMesColumn(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim().toUpperCase();
  const yearMatch = str.match(/\b(\d{4})\b/);
  if (yearMatch) return Number(yearMatch[1]);
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.getFullYear();
  return null;
}

function findValue(row: Record<string, unknown>, headers: string[], aliases: string[]): unknown {
  const normalizedToOriginal = new Map<string, string>();
  for (const h of headers) {
    normalizedToOriginal.set(normalizeHeader(h), h);
  }
  for (const alias of aliases) {
    const original = normalizedToOriginal.get(normalizeHeader(alias));
    if (original !== undefined && row[original] !== undefined && row[original] !== '') {
      return row[original];
    }
  }
  return undefined;
}

function mapRow(row: Record<string, unknown>, headers: string[]): ImportPortfolioRow {
  const customerFullName = String(findValue(row, headers, ['NOMBRE_Y_APELLIDO', 'NOMBRE_APELLIDO', 'NOMBRE']) ?? '').trim();
  const customerPhone = String(findValue(row, headers, ['TELEFONO', 'TEL', 'CELULAR']) ?? '').trim() || null;
  const customerAddress = String(findValue(row, headers, ['DIRECCION', 'DOMICILIO', 'DIRECCIÓN']) ?? '').trim() || null;
  const betweenStreets = String(findValue(row, headers, ['ENTRE_CALLES', 'ENTRECALLES', 'REFERENCIA']) ?? '').trim() || null;
  const operationNumber = String(findValue(row, headers, ['NUMERO_TARJETA', 'NUM_TARJETA', 'TARJETA', 'NÚMERO_TARJETA']) ?? '').trim() || null;
  const productName = String(findValue(row, headers, [
    'ARTICULO', 'ARTÍCULO', 'PRODUCTO', 'DESCRIPCION', 'DESCRIPCIÓN',
    'ITEM', 'DETALLE', 'ART', 'ART.', 'PRODUCTOS', 'CONCEPTO',
    'DESCRIPCION_ARTICULO', 'ARTICULO_VENDIDO', 'MERCADERIA', 'MERCADERÍA',
  ]) ?? '').trim() || 'Artículo no especificado';
  // TODO: leer cantidad desde columna de Excel cuando se normalice el formato
  // const quantity = parseNumber(findValue(row, headers, ['CANTIDAD', 'QTY', 'UNIDADES', 'CANT'])) ?? 1;

  const installmentCount = parseNumber(findValue(row, headers, ['CANTIDAD_CUOTAS', 'CUOTAS', 'N_CUOTAS', 'N*CUOTAS', 'NÚMERO_CUOTAS'])) ?? 0;
  const installmentAmount = parseNumber(findValue(row, headers, ['VALOR_CUOTA', 'CUOTA', 'MONTO_CUOTA'])) ?? 0;
  const totalAmount = parseNumber(findValue(row, headers, ['TOTAL', 'MONTO_TOTAL'])) ?? installmentCount * installmentAmount;
  const accumulatedPayment = parseNumber(findValue(row, headers, ['PAGO_ACUMULADO', 'VA_PAGANDO', 'PAGADO', 'ACUMULADO'])) ?? 0;
  const remainingAmount = parseNumber(findValue(row, headers, ['RESTANTE', 'SALDO'])) ?? Math.max(0, totalAmount - accumulatedPayment);

  const mesValue = findValue(row, headers, ['MES', 'MES_ACTUAL']);
  const mesYear = getYearFromMesColumn(mesValue) ?? new Date().getFullYear();

  const payments: ImportPortfolioPayment[] = [];
  for (const h of headers) {
    const monthInfo = detectMonthColumn(h);
    if (!monthInfo) continue;
    const val = parseNumber(row[h]);
    if (val !== null && val > 0) {
      const year = monthInfo.year ?? mesYear;
      const dateStr = `${year}-${String(monthInfo.month).padStart(2, '0')}-01`;
      payments.push({
        amount: val,
        paymentDate: dateStr,
        paymentMethod: 'EFECTIVO',
      });
    }
  }

  return {
    operationNumber,
    customerFullName,
    customerPhone,
    customerAddress,
    betweenStreets,
    productName,
    saleDate: new Date().toISOString().split('T')[0],
    installmentCount,
    installmentAmount,
    totalAmount,
    accumulatedPayment,
    remainingAmount,
    payments,
  };
}

export function previewPortfolioFile(buffer: ArrayBuffer): ImportPortfolioPreview {
  const workbook = xlsx.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

  const rows: ImportPortfolioRow[] = [];
  const errors: ImportValidationError[] = [];
  const warnings: ImportValidationWarning[] = [];

  if (jsonRows.length === 0) {
    return {
      rows: [],
      rowCount: 0,
      uniqueCustomers: 0,
      accountCount: 0,
      totalPayments: 0,
      totalFinanced: 0,
      totalCollected: 0,
      errors: [{ rowIndex: 0, message: 'El archivo no contiene filas de datos' }],
      warnings: [],
    };
  }

  const headers = Object.keys(jsonRows[0]);
  const operationNumbers = new Map<string, number[]>();
  const customerNames = new Map<string, string[]>();

  for (let i = 0; i < jsonRows.length; i++) {
    const rawRow = jsonRows[i];
    const row = mapRow(rawRow, headers);
    rows.push(row);

    if (!row.customerFullName) {
      errors.push({ rowIndex: i, message: 'Nombre y apellido vacío' });
    }
    if (row.installmentCount <= 0) {
      errors.push({ rowIndex: i, message: 'Cantidad de cuotas debe ser mayor a 0' });
    }
    if (row.installmentAmount <= 0) {
      errors.push({ rowIndex: i, message: 'Valor de cuota debe ser mayor a 0' });
    }

    const expectedTotal = row.installmentCount * row.installmentAmount;
    if (expectedTotal > 0 && Math.abs(row.totalAmount - expectedTotal) > 1) {
      warnings.push({ rowIndex: i, message: `TOTAL (${row.totalAmount}) difiere de cuota*cantidad (${expectedTotal})` });
    }

    const sumPayments = row.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(row.accumulatedPayment - sumPayments) > 1) {
      warnings.push({ rowIndex: i, message: `PAGO_ACUMULADO (${row.accumulatedPayment}) difiere de la suma mensual (${sumPayments})` });
    }

    if (Math.abs(row.remainingAmount - (row.totalAmount - row.accumulatedPayment)) > 1) {
      warnings.push({ rowIndex: i, message: `RESTANTE (${row.remainingAmount}) difiere de total - acumulado` });
    }

    if (row.productName === 'Artículo no especificado') {
      warnings.push({ rowIndex: i, message: `No se encontró una columna de producto reconocida (Tarjeta: ${row.operationNumber ?? 'sin número'})` });
    }

    if (row.operationNumber) {
      const list = operationNumbers.get(row.operationNumber) ?? [];
      list.push(i);
      operationNumbers.set(row.operationNumber, list);
    }

    const key = (row.customerPhone ?? '') + '|' + row.customerFullName.toLowerCase();
    const existing = customerNames.get(key);
    if (existing && existing[0] !== row.customerFullName) {
      warnings.push({ rowIndex: i, message: `Cliente con mismo teléfono pero distinto nombre` });
    } else {
      customerNames.set(key, [row.customerFullName]);
    }
  }

  for (const [opNum, indices] of operationNumbers.entries()) {
    if (indices.length > 1) {
      for (const idx of indices) {
        warnings.push({ rowIndex: idx, message: `Número de tarjeta repetido: ${opNum}` });
      }
    }
  }

  const totalFinanced = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalCollected = rows.reduce((sum, r) => sum + r.accumulatedPayment, 0);

  return {
    rows,
    rowCount: rows.length,
    uniqueCustomers: new Set(rows.map((r) => (r.customerPhone ?? '') + '|' + r.customerFullName.toLowerCase())).size,
    accountCount: rows.length,
    totalPayments: rows.reduce((sum, r) => sum + r.payments.length, 0),
    totalFinanced,
    totalCollected,
    errors,
    warnings,
  };
}

function extractSupabaseError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    if (e.message) {
      const parts = [e.message];
      if (e.details) parts.push(`details: ${e.details}`);
      if (e.hint) parts.push(`hint: ${e.hint}`);
      if (e.code) parts.push(`code: ${e.code}`);
      return parts.join(' | ');
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export async function importPortfolioBatch(
  supabase: SupabaseClient,
  rows: ImportPortfolioRow[]
): Promise<ImportPortfolioResult> {
  const details: { rowIndex: number; creditAccountId?: string; error?: string }[] = [];
  const skippedDetails: { rowIndex: number; operationNumber?: string | null; reason: string }[] = [];
  let imported = 0;
  let failed = 0;
  let skipped = 0;

  // Pre-cargar operation_numbers existentes para evitar duplicados (Opción A: control en Node.js)
  const operationNumbers = rows
    .map((r) => r.operationNumber)
    .filter((n): n is string => !!n);

  const existingNumbers = new Set<string>();
  if (operationNumbers.length > 0) {
    const { data, error } = await supabase
      .from('credit_accounts')
      .select('operation_number')
      .in('operation_number', operationNumbers);
    if (!error && data) {
      for (const d of data) {
        if (d.operation_number) existingNumbers.add(d.operation_number);
      }
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.operationNumber && existingNumbers.has(row.operationNumber)) {
      skipped++;
      skippedDetails.push({ rowIndex: i, operationNumber: row.operationNumber, reason: 'Cuenta ya importada' });
      continue;
    }
    try {
      const result = await importPortfolioRow(supabase, row);
      imported++;
      details.push({ rowIndex: i, creditAccountId: result.creditAccountId });
    } catch (err) {
      failed++;
      const errorMsg = extractSupabaseError(err);
      console.error(`[importPortfolioBatch] Fila ${i + 1} error:`, err);
      details.push({ rowIndex: i, error: errorMsg });
    }
  }

  return { imported, failed, skipped, details, skippedDetails };
}
