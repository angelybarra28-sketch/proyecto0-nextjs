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
  JANUARY: 1,
  FEBRUARY: 2,
  MARCH: 3,
  APRIL: 4,
  JUNE: 6,
  JULY: 7,
  AUGUST: 8,
  SEPTEMBER: 9,
  OCTOBER: 10,
  NOVEMBER: 11,
  DECEMBER: 12,
  ENE: 1,
  FEB: 2,
  MAR: 3,
  ABR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SEP: 9,
  SEPT: 9,
  OCT: 10,
  NOV: 11,
  DIC: 12,
  JAN: 1,
  APR: 4,
  AUG: 8,
  DEC: 12,
};

const NUMERIC_MONTH_MAP: Record<string, number> = {
  '1': 1, '01': 1,
  '2': 2, '02': 2,
  '3': 3, '03': 3,
  '4': 4, '04': 4,
  '5': 5, '05': 5,
  '6': 6, '06': 6,
  '7': 7, '07': 7,
  '8': 8, '08': 8,
  '9': 9, '09': 9,
  '10': 10,
  '11': 11,
  '12': 12,
};

function normalizeHeader(h: string): string {
  return h.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
}

function headerMatchesAlias(headerNorm: string, aliasNorm: string): boolean {
  return headerNorm === aliasNorm || headerNorm.startsWith(aliasNorm + '_');
}

function detectMonthColumn(header: string): { month: number; year?: number } | null {
  const normalized = normalizeHeader(header);

  // Skip columns that are clearly not months (common column names that are purely numeric but not month columns)
  const nonMonthAliases = [
    'NUMERO_TARJETA', 'NUM_TARJETA', 'TARJETA', 'NUMERO_TARJETA', 'NUMERO', 'N',
    'CANTIDAD_CUOTAS', 'CUOTAS', 'N_CUOTAS', 'N_CUOTA', 'NRO_CUOTAS', 'NRO_CUOTA',
    'VALOR_CUOTA', 'CUOTA', 'MONTO_CUOTA',
    'TOTAL', 'MONTO_TOTAL',
    'PAGO_ACUMULADO', 'VA_PAGANDO', 'PAGADO', 'ACUMULADO', 'PAGO', 'IMPORTE_PAGO',
    'RESTANTE', 'SALDO',
    'NOMBRE_Y_APELLIDO', 'NOMBRE_APELLIDO', 'NOMBRE',
    'TELEFONO', 'TEL', 'CELULAR',
    'DIRECCION', 'DOMICILIO', 'DIRECCION',
    'ENTRE_CALLES', 'ENTRECALLES', 'REFERENCIA',
    'ARTICULO', 'ARTICULO', 'PRODUCTO', 'DESCRIPCION', 'DESCRIPCION',
    'ITEM', 'DETALLE', 'ART', 'PRODUCTOS', 'CONCEPTO',
    'DESCRIPCION_ARTICULO', 'ARTICULO_VENDIDO', 'MERCADERIA', 'MERCADERIA',
    'FECHA_DE_VENTA', 'FECHA_VENTA', 'FECHA',
    'MES', 'MES_ACTUAL',
    'ANO', 'ANIO', 'YEAR',
    'CANTIDAD', 'QTY', 'UNIDADES', 'CANT',
    'ESTADO', 'STATUS', 'STATE', 'TERMINADO', 'FINISHED',
  ];
  const normalizedLower = normalized.toLowerCase();
  for (const alias of nonMonthAliases) {
    if (normalizedLower === normalizeHeader(alias).toLowerCase()) return null;
  }

  // Full month name with year: ENERO_2025, JANUARY_2025
  const fullNameWithYear = normalized.match(/^(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE|JANUARY|FEBRUARY|MARCH|APRIL|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)_(\d{4})$/);
  if (fullNameWithYear) {
    const month = MONTH_MAP[fullNameWithYear[1]];
    if (month) return { month, year: Number(fullNameWithYear[2]) };
  }

  // Abbreviated month name with year: ENE-25→ENE25, Jan-25→JAN25, Feb-25→FEB25
  const abbrWithYear = normalized.match(/^(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SEPT|OCT|NOV|DIC|JAN|APR|AUG|DEC)[_]?(\d{2,4})$/);
  if (abbrWithYear) {
    const month = MONTH_MAP[abbrWithYear[1]];
    if (month) {
      let year = Number(abbrWithYear[2]);
      if (year < 100) year += year < 50 ? 2000 : 1900;
      return { month, year };
    }
  }

  // Full month name without year: ENERO, JANUARY
  const fullNameOnly = normalized.match(/^(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE|JANUARY|FEBRUARY|MARCH|APRIL|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)$/);
  if (fullNameOnly) {
    const month = MONTH_MAP[fullNameOnly[1]];
    if (month) return { month };
  }

  // Abbreviated month name without year: ENE, JAN, APR, AUG, DEC
  const abbrOnly = normalized.match(/^(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SEPT|OCT|NOV|DIC|JAN|APR|AUG|DEC)$/);
  if (abbrOnly) {
    const month = MONTH_MAP[abbrOnly[1]];
    if (month) return { month };
  }

  // Numeric month with year: 1_2025, 01_2025, 12_2025, MES_1_2025, MES_01_2025
  const numWithYear = normalized.match(/^(?:MES_)?(\d{1,2})_(\d{4})$/);
  if (numWithYear) {
    const month = NUMERIC_MONTH_MAP[numWithYear[1]];
    if (month) return { month, year: Number(numWithYear[2]) };
  }

  // Pure numeric month (1-12) — this handles Excel column headers that are just numbers
  const pureNum = normalized.match(/^(\d{1,2})$/);
  if (pureNum) {
    const month = NUMERIC_MONTH_MAP[pureNum[1]];
    if (month) return { month };
  }

  // MES_1, MES_01, etc.
  const mesPrefix = normalized.match(/^MES[_]?(\d{1,2})$/);
  if (mesPrefix) {
    const month = NUMERIC_MONTH_MAP[mesPrefix[1]];
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

function parseSaleDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'number') {
    // Serial de Excel a JS Date
    const epoch = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(epoch.getTime())) {
      return epoch.toISOString().split('T')[0];
    }
    return null;
  }

  const str = String(value).trim();

  // DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const d = Number(ddmmyyyy[1]);
    const m = Number(ddmmyyyy[2]);
    const y = Number(ddmmyyyy[3]);
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime()) && date.getDate() === d) {
      return date.toISOString().split('T')[0];
    }
  }

  // YYYY-MM-DD
  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime()) && date.getDate() === d) {
      return date.toISOString().split('T')[0];
    }
  }

  const generic = new Date(str);
  if (!isNaN(generic.getTime())) {
    return generic.toISOString().split('T')[0];
  }

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

function findAllValues(row: Record<string, unknown>, headers: string[], aliases: string[]): string[] {
  const values: string[] = [];
  for (const h of headers) {
    const nh = normalizeHeader(h);
    for (const alias of aliases) {
      if (headerMatchesAlias(nh, normalizeHeader(alias))) {
        const val = row[h];
        if (val !== undefined && val !== '') {
          const str = String(val).trim();
          if (str) values.push(str);
        }
        break;
      }
    }
  }
  return values;
}

function detectMissingColumns(headers: string[]): string[] {
  const missing: string[] = [];
  const has = (aliases: string[]) =>
    aliases.some((a) => headers.some((h) => normalizeHeader(h) === normalizeHeader(a)));

  if (!has(['NUMERO_TARJETA', 'NUM_TARJETA', 'TARJETA', 'NÚMERO_TARJETA', 'NUMERO', 'N'])) {
    missing.push('Número de tarjeta');
  }
  if (!has(['NOMBRE_Y_APELLIDO', 'NOMBRE_APELLIDO', 'NOMBRE'])) {
    missing.push('Nombre y apellido');
  }
  if (!has(['VALOR_CUOTA', 'CUOTA', 'MONTO_CUOTA'])) {
    missing.push('Cuota');
  }
  if (!has(['TOTAL', 'MONTO_TOTAL'])) {
    missing.push('Total');
  }
  return missing;
}

function mapRow(row: Record<string, unknown>, headers: string[]): ImportPortfolioRow {
  const customerFullName = String(findValue(row, headers, ['NOMBRE_Y_APELLIDO', 'NOMBRE_APELLIDO', 'NOMBRE']) ?? '').trim();
  const customerPhone = String(findValue(row, headers, ['TELEFONO', 'TEL', 'CELULAR']) ?? '').trim() || null;
  const customerAddress = String(findValue(row, headers, ['DIRECCION', 'DOMICILIO', 'DIRECCIÓN']) ?? '').trim() || null;
  const betweenStreets = String(findValue(row, headers, ['ENTRE_CALLES', 'ENTRECALLES', 'REFERENCIA']) ?? '').trim() || null;
  const operationNumber = String(findValue(row, headers, ['NUMERO_TARJETA', 'NUM_TARJETA', 'TARJETA', 'NÚMERO_TARJETA', 'NUMERO', 'N']) ?? '').trim() || null;

  const productParts = findAllValues(row, headers, [
    'ARTICULO', 'ARTÍCULO', 'PRODUCTO', 'DESCRIPCION', 'DESCRIPCIÓN',
    'ITEM', 'DETALLE', 'ART', 'ART.', 'PRODUCTOS', 'CONCEPTO',
    'DESCRIPCION_ARTICULO', 'ARTICULO_VENDIDO', 'MERCADERIA', 'MERCADERÍA',
  ]);
  const productName = productParts.length > 0 ? productParts.join(' + ') : 'Artículo no especificado';

  const installmentCount = parseNumber(findValue(row, headers, ['CANTIDAD_CUOTAS', 'CUOTAS', 'N_CUOTAS', 'N*CUOTAS', 'NÚMERO_CUOTAS', 'N_CUOTA', 'NRO_CUOTAS', 'NRO_CUOTA'])) ?? 0;
  const installmentAmount = parseNumber(findValue(row, headers, ['VALOR_CUOTA', 'CUOTA', 'MONTO_CUOTA'])) ?? 0;
  const totalAmount = parseNumber(findValue(row, headers, ['TOTAL', 'MONTO_TOTAL'])) ?? installmentCount * installmentAmount;
  let accumulatedPayment = parseNumber(findValue(row, headers, ['PAGO_ACUMULADO', 'VA_PAGANDO', 'PAGADO', 'ACUMULADO', 'PAGO', 'IMPORTE_PAGO'])) ?? 0;
  let remainingAmount = parseNumber(findValue(row, headers, ['RESTANTE', 'SALDO'])) ?? Math.max(0, totalAmount - accumulatedPayment);

  const saleDateRaw = findValue(row, headers, ['FECHA_DE_VENTA', 'FECHA_VENTA', 'FECHA']);
  const saleDateParsed = parseSaleDate(saleDateRaw);

  // Derive originMonth and originYear from MES/AÑO columns first
  const mesValue = findValue(row, headers, ['MES', 'MES_ACTUAL']);
  const mesNormalized = String(mesValue ?? '').trim().toUpperCase();
  let originMonth = MONTH_MAP[mesNormalized] ?? NUMERIC_MONTH_MAP[mesNormalized] ?? null;

  const yearValue = findValue(row, headers, ['AÑO', 'ANO', 'ANIO', 'YEAR']);
  let originYear = parseNumber(yearValue) ?? null;

  // If no MES/AÑO but FECHA_DE_VENTA exists, derive originMonth/originYear from the date
  if (!originMonth && saleDateParsed) {
    const dateObj = new Date(saleDateParsed + 'T00:00:00');
    if (!isNaN(dateObj.getTime())) {
      originMonth = dateObj.getMonth() + 1;
    }
  }
  if (!originYear && saleDateParsed) {
    const dateObj = new Date(saleDateParsed + 'T00:00:00');
    if (!isNaN(dateObj.getTime())) {
      originYear = dateObj.getFullYear();
    }
  }

  // Smart saleDate: use parsed date, or derive from originMonth/originYear, or today
  let saleDate: string;
  if (saleDateParsed) {
    saleDate = saleDateParsed;
  } else if (originMonth && originYear) {
    saleDate = `${originYear}-${String(originMonth).padStart(2, '0')}-01`;
  } else {
    saleDate = new Date().toISOString().split('T')[0];
  }

  // Legacy: infer year for monthly payment columns when year is not explicit
  const mesYear = getYearFromMesColumn(mesValue) ?? originYear ?? new Date().getFullYear();

  const payments: ImportPortfolioPayment[] = [];
  for (const h of headers) {
    const monthInfo = detectMonthColumn(h);
    if (!monthInfo) continue;
    const rawVal = row[h];
    const val = parseNumber(rawVal);
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

  // Debug: log first 5 rows with payment info
  const rowDebugIdx = 0;
  // (logging is done in the preview loop below)

  // If accumulatedPayment is 0 but monthly payments were detected, use their sum
  const sumPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  if (accumulatedPayment <= 0 && sumPayments > 0) {
    accumulatedPayment = sumPayments;
    remainingAmount = Math.max(0, totalAmount - accumulatedPayment);
  }

  return {
    operationNumber,
    customerFullName,
    customerPhone,
    customerAddress,
    betweenStreets,
    productName,
    saleDate,
    installmentCount,
    installmentAmount,
    totalAmount,
    accumulatedPayment,
    remainingAmount,
    payments,
    originMonth,
    originYear,
  };
}

export function previewPortfolioFile(buffer: ArrayBuffer): ImportPortfolioPreview {
  const workbook = xlsx.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

  const rawHeaders = jsonRows.length > 0 ? Object.keys(jsonRows[0]) : [];
  const detectedMonthHeaders = rawHeaders.filter((h) => detectMonthColumn(h) !== null);
  console.log('[importPortfolio] Raw headers (first 30):', JSON.stringify(rawHeaders.slice(0, 30)));
  console.log('[importPortfolio] Detected month headers:', JSON.stringify(detectedMonthHeaders));
  if (jsonRows.length > 0) {
    console.log('[importPortfolio] First row keys and types:', rawHeaders.slice(0, 15).map((k) => `${k}(${typeof jsonRows[0][k]})=${jsonRows[0][k]}`).join(' | '));
  }

  const rows: ImportPortfolioRow[] = [];
  const errors: ImportValidationError[] = [];
  const warnings: ImportValidationWarning[] = [];
  const missingColumns: string[] = [];

if (jsonRows.length === 0) {
    return {
      rows: [],
      importableRows: [],
      rowCount: 0,
      uniqueCustomers: 0,
      accountCount: 0,
      totalPayments: 0,
      totalFinanced: 0,
      totalCollected: 0,
      stats: {
        emptyProductCount: 0,
        missingSaleDateCount: 0,
        missingAddressCount: 0,
        missingOperationNumberCount: 0,
        missingNameCount: 0,
        duplicateInFileCount: 0,
        existingInDbCount: 0,
        invalidCount: 0,
        importableCount: 0,
        skippedEmptyRowCount: 0,
        paymentsDetectedCount: 0,
      },
      errors: [{ rowIndex: 0, message: 'El archivo no contiene filas de datos' }],
      warnings: [],
      missingColumns: [],
      detectedMonthColumns: [],
      rawHeadersSample: [],
    };
  }

  const headers = rawHeaders;
  const detectedMonthCols = headers.filter((h) => detectMonthColumn(h) !== null);
  console.log('[importPortfolio] ALL headers:', JSON.stringify(headers));
  console.log('[importPortfolio] Detected month columns:', JSON.stringify(detectedMonthCols));
  if (jsonRows.length > 0) {
    const sampleHeaders = headers.slice(0, 20);
    console.log('[importPortfolio] First row values for first 20 headers:', sampleHeaders.map((h) => `${h}="${jsonRows[0][h]}"`).join(' | '));
  }

  missingColumns.push(...detectMissingColumns(headers));
  for (const col of missingColumns) {
    warnings.push({ rowIndex: 0, message: `Columna ${col} no encontrada en el archivo` });
  }

  const operationNumbers = new Map<string, number[]>();
  const customerNames = new Map<string, string[]>();

  // Estadísticas de calidad
  let emptyProductCount = 0;
  let missingSaleDateCount = 0;
  let missingAddressCount = 0;
  let missingOperationNumberCount = 0;
  let missingNameCount = 0;
  let invalidCount = 0;
  let skippedEmptyRowCount = 0;
  let paymentsDetectedCount = 0;

  for (let i = 0; i < jsonRows.length; i++) {
    const rawRow = jsonRows[i];
    const row = mapRow(rawRow, headers);

    // Filas sin datos financieros (cuota y total en 0) → se ignoran completamente
    // Incluye productos devueltos/anulados y filas vacías
    if (row.installmentAmount <= 0 && row.totalAmount <= 0) {
      skippedEmptyRowCount++;
      continue;
    }

    rows.push(row);

    // Debug: log first 5 rows
    if (i < 5) {
      console.log(`[importPortfolio] Row ${i}: name="${row.customerFullName}", tarjeta="${row.operationNumber}", cuota=${row.installmentAmount}, total=${row.totalAmount}, saleDate=${row.saleDate}, originMonth=${row.originMonth}, originYear=${row.originYear}, payments=${row.payments.length}, accumulatedPayment=${row.accumulatedPayment}`);
      if (row.payments.length > 0) {
        row.payments.forEach((p, j) => console.log(`  payment[${j}]: $${p.amount} on ${p.paymentDate}`));
      }
    }

    // Estadísticas
    if (row.productName === 'Artículo no especificado') emptyProductCount++;
    const hasSaleDateRaw = findValue(rawRow, headers, ['FECHA_DE_VENTA', 'FECHA_VENTA', 'FECHA']);
    if (!hasSaleDateRaw || !parseSaleDate(hasSaleDateRaw)) missingSaleDateCount++;
    if (!row.customerAddress) missingAddressCount++;
    if (!row.operationNumber) missingOperationNumberCount++;
    if (!row.customerFullName) missingNameCount++;
    paymentsDetectedCount += row.payments.length;

    if (!row.customerFullName) {
      row.customerFullName = 'Sin nombre';
      warnings.push({ rowIndex: i, message: 'Nombre y apellido vacío → se usó "Sin nombre"' });
    }
    if (!row.operationNumber) {
      row.operationNumber = `AUTO-${i + 1}`;
      warnings.push({ rowIndex: i, message: 'Número de tarjeta vacío → se generó uno automático' });
    }
    if (row.installmentCount <= 0) {
      row.installmentCount = 1;
      warnings.push({ rowIndex: i, message: 'Cantidad de cuotas vacía → se usó 1' });
    }
    if (row.installmentAmount <= 0) {
      if (row.totalAmount > 0) {
        row.installmentAmount = Math.round(row.totalAmount / row.installmentCount);
        warnings.push({ rowIndex: i, message: `Valor de cuota vacío → se derivó del total (${row.installmentAmount})` });
      } else {
        row.installmentAmount = 1;
        warnings.push({ rowIndex: i, message: 'Valor de cuota y total en 0 → valores mínimos asignados' });
      }
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

  let duplicateInFileCount = 0;
  for (const [opNum, indices] of operationNumbers.entries()) {
    if (indices.length > 1) {
      duplicateInFileCount += indices.length - 1;
      for (let j = 1; j < indices.length; j++) {
        warnings.push({ rowIndex: indices[j], message: `Número de tarjeta repetido en el archivo: ${opNum} (se mantiene la primera ocurrencia)` });
      }
    }
  }

  const totalFinanced = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalCollected = rows.reduce((sum, r) => sum + r.accumulatedPayment, 0);
  const uniqueCustomers = new Set(rows.map((r) => (r.customerPhone ?? '') + '|' + r.customerFullName.toLowerCase())).size;
  const accountCount = rows.length;

  // Conteo de importables = filas válidas sin duplicados dentro del archivo
  const invalidRowIndices = new Set(errors.map((e) => e.rowIndex));
  const duplicateRowIndices = new Set<number>();
  for (const [, indices] of operationNumbers.entries()) {
    if (indices.length > 1) indices.slice(1).forEach((i) => duplicateRowIndices.add(i));
  }
  const importableIndices = rows.map((_, i) => i).filter((i) => !invalidRowIndices.has(i) && !duplicateRowIndices.has(i));
  const importableRows = importableIndices.map((i) => rows[i]);
  const importableCount = importableIndices.length;

  return {
    rows,
    importableRows,
    rowCount: rows.length,
    uniqueCustomers,
    accountCount,
    totalPayments: rows.reduce((sum, r) => sum + r.payments.length, 0),
    totalFinanced,
    totalCollected,
    stats: {
      emptyProductCount,
      missingSaleDateCount,
      missingAddressCount,
      missingOperationNumberCount,
      missingNameCount,
      duplicateInFileCount,
      existingInDbCount: 0, // se completa en el frontend o batch
      invalidCount,
      importableCount,
      skippedEmptyRowCount,
      paymentsDetectedCount,
    },
    errors,
    warnings,
    missingColumns,
    detectedMonthColumns: detectedMonthCols,
    rawHeadersSample: headers.slice(0, 25),
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
    const BATCH = 200;
    for (let i = 0; i < operationNumbers.length; i += BATCH) {
      const batch = operationNumbers.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from('credit_accounts')
        .select('operation_number')
        .in('operation_number', batch);
      if (!error && data) {
        for (const d of data) {
          if (d.operation_number) existingNumbers.add(d.operation_number);
        }
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
      console.log(`[importPortfolioBatch] Fila ${i + 1} OK: tarjeta=${row.operationNumber}, paymentsImported=${result.paymentsImported}, customer=${row.customerFullName}`);
      details.push({ rowIndex: i, creditAccountId: result.creditAccountId });
    } catch (err) {
      failed++;
      const errorMsg = extractSupabaseError(err);
      console.error(`[importPortfolioBatch] Fila ${i + 1} error: tarjeta=${row.operationNumber}, name=${row.customerFullName}, payments=${row.payments.length}, errorMsg=${errorMsg}`);
      details.push({ rowIndex: i, error: errorMsg });
    }
  }

  return { imported, failed, skipped, details, skippedDetails };
}
