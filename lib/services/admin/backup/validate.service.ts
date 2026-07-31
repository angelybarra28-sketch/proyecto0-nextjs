import { computeChecksum } from './checksum';
import { getBackupTables, SUPPORTED_BACKUP_VERSIONS } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    tables: number;
    rows: number;
    checksum: string;
    version: string;
    exportedAt: string;
  };
}

interface ForeignKeyRule {
  table: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

const FK_RULES: ForeignKeyRule[] = [
  { table: 'products', column: 'category_id', referencedTable: 'categories', referencedColumn: 'id' },
  { table: 'product_categories', column: 'product_id', referencedTable: 'products', referencedColumn: 'id' },
  { table: 'product_categories', column: 'category_id', referencedTable: 'categories', referencedColumn: 'id' },
  { table: 'sales', column: 'customer_id', referencedTable: 'customers', referencedColumn: 'id' },
  { table: 'sale_items', column: 'sale_id', referencedTable: 'sales', referencedColumn: 'id' },
  { table: 'installments', column: 'sale_id', referencedTable: 'sales', referencedColumn: 'id' },
  { table: 'payments', column: 'sale_id', referencedTable: 'sales', referencedColumn: 'id' },
  { table: 'payments', column: 'customer_id', referencedTable: 'customers', referencedColumn: 'id' },
  { table: 'credit_accounts', column: 'customer_id', referencedTable: 'customers', referencedColumn: 'id' },
  { table: 'credit_account_items', column: 'credit_account_id', referencedTable: 'credit_accounts', referencedColumn: 'id' },
  { table: 'credit_installments', column: 'credit_account_id', referencedTable: 'credit_accounts', referencedColumn: 'id' },
  { table: 'credit_payments', column: 'credit_account_id', referencedTable: 'credit_accounts', referencedColumn: 'id' },
  { table: 'credit_payment_allocations', column: 'credit_payment_id', referencedTable: 'credit_payments', referencedColumn: 'id' },
  { table: 'credit_payment_allocations', column: 'credit_installment_id', referencedTable: 'credit_installments', referencedColumn: 'id' },
  { table: 'credit_collection_notes', column: 'credit_account_id', referencedTable: 'credit_accounts', referencedColumn: 'id' },
  { table: 'proveedor_compras', column: 'proveedor_id', referencedTable: 'proveedores', referencedColumn: 'id' },
  { table: 'proveedor_compra_items', column: 'compra_id', referencedTable: 'proveedor_compras', referencedColumn: 'id' },
  { table: 'proveedor_pagos', column: 'proveedor_id', referencedTable: 'proveedores', referencedColumn: 'id' },
  { table: 'proveedor_adjuntos', column: 'compra_id', referencedTable: 'proveedor_compras', referencedColumn: 'id' },
  { table: 'product_price_history', column: 'product_id', referencedTable: 'products', referencedColumn: 'id' },
];

function buildIdIndex(data: Record<string, unknown[]>): Record<string, Set<string>> {
  const index: Record<string, Set<string>> = {};
  for (const [tableName, rows] of Object.entries(data)) {
    const ids = new Set<string>();
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      if (typeof r.id === 'string') {
        ids.add(r.id);
      }
    }
    index[tableName] = ids;
  }
  return index;
}

function validateManifest(payload: unknown): { errors: string[]; version: string } {
  const errors: string[] = [];
  let version = '';

  if (!payload || typeof payload !== 'object') {
    errors.push('El backup no contiene un objeto válido');
    return { errors, version };
  }

  const p = payload as Record<string, unknown>;

  if (!p.manifest || typeof p.manifest !== 'object') {
    errors.push('manifest: campo obligatorio faltante o inválido');
    return { errors, version };
  }

  const m = p.manifest as Record<string, unknown>;

  if (!m.version || typeof m.version !== 'string') {
    errors.push('manifest.version: campo obligatorio faltante o inválido');
  } else {
    version = m.version;
    if (!SUPPORTED_BACKUP_VERSIONS.includes(version as (typeof SUPPORTED_BACKUP_VERSIONS)[number])) {
      errors.push(`manifest.version: versión "${version}" no soportada (soportadas: ${SUPPORTED_BACKUP_VERSIONS.join(', ')})`);
    }
  }

  if (!m.exportedAt || typeof m.exportedAt !== 'string') {
    errors.push('manifest.exportedAt: campo obligatorio faltante o inválido');
  } else if (isNaN(Date.parse(m.exportedAt))) {
    errors.push(`manifest.exportedAt: fecha inválida (${m.exportedAt})`);
  }

  if (!m.appVersion || typeof m.appVersion !== 'string') {
    errors.push('manifest.appVersion: campo obligatorio faltante o inválido');
  }

  if (!m.projectUrl || typeof m.projectUrl !== 'string') {
    errors.push('manifest.projectUrl: campo obligatorio faltante o inválido');
  }

  return { errors, version };
}

function validateDataStructure(data: unknown, expectedTables: readonly string[]): string[] {
  const errors: string[] = [];
  const expectedSet = new Set<string>(expectedTables);

  if (!data || typeof data !== 'object') {
    errors.push('data: campo obligatorio faltante o inválido');
    return errors;
  }

  const d = data as Record<string, unknown>;
  const presentTables = new Set(Object.keys(d));

  for (const expected of expectedTables) {
    if (!presentTables.has(expected)) {
      errors.push(`data: tabla faltante "${expected}"`);
    } else {
      const rows = d[expected];
      if (!Array.isArray(rows)) {
        errors.push(`data.${expected}: debe ser un array`);
      }
    }
  }

  for (const tableName of presentTables) {
    if (!expectedSet.has(tableName)) {
      errors.push(`data: tabla desconocida "${tableName}"`);
    }
  }

  return errors;
}

function validateRowCounts(payload: unknown, expectedTables: readonly string[]): string[] {
  const errors: string[] = [];
  const p = payload as Record<string, unknown>;
  const m = p.manifest as Record<string, unknown>;
  const d = p.data as Record<string, unknown[]>;

  if (!m.rowCounts || typeof m.rowCounts !== 'object') {
    errors.push('manifest.rowCounts: campo obligatorio faltante o inválido');
    return errors;
  }

  const rowCounts = m.rowCounts as Record<string, number>;

  for (const table of expectedTables) {
    const expected = rowCounts[table];
    const actual = d[table]?.length ?? 0;

    if (typeof expected !== 'number') {
      errors.push(`manifest.rowCounts.${table}: valor faltante o inválido`);
    } else if (expected !== actual) {
      errors.push(`manifest.rowCounts.${table}: declarado ${expected}, real ${actual}`);
    }
  }

  return errors;
}

function validateDuplicateIds(data: Record<string, unknown[]>): string[] {
  const errors: string[] = [];

  for (const [tableName, rows] of Object.entries(data)) {
    if (!Array.isArray(rows)) continue;

    const seen = new Map<string, number[]>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, unknown>;
      if (typeof row.id === 'string') {
        const id = row.id;
        if (seen.has(id)) {
          seen.get(id)!.push(i);
        } else {
          seen.set(id, [i]);
        }
      }
    }

    for (const [id, positions] of seen) {
      if (positions.length > 1) {
        errors.push(`data.${tableName}: ID duplicado "${id}" en filas ${positions.map(p => p + 1).join(', ')}`);
      }
    }
  }

  return errors;
}

function validateForeignKeys(data: Record<string, unknown[]>): string[] {
  const errors: string[] = [];
  const idIndex = buildIdIndex(data);

  for (const rule of FK_RULES) {
    const rows = data[rule.table];
    if (!Array.isArray(rows)) continue;

    const referencedIds = idIndex[rule.referencedTable];
    if (!referencedIds) {
      errors.push(`FK ${rule.table}.${rule.column}: tabla referenciada "${rule.referencedTable}" no encontrada`);
      continue;
    }

    let rowIdx = 0;
    for (const row of rows) {
      rowIdx++;
      const r = row as Record<string, unknown>;
      const value = r[rule.column];

      if (value === null || value === undefined) continue;

      if (typeof value !== 'string') {
        errors.push(`FK ${rule.table}.${rule.column}: valor inválido "${String(value)}" en fila ${rowIdx}`);
        continue;
      }

      if (!referencedIds.has(value)) {
        errors.push(`FK ${rule.table}.${rule.column}: valor "${value}" no encontrado en ${rule.referencedTable}.${rule.referencedColumn} (fila ${rowIdx})`);
      }
    }
  }

  return errors;
}

export function validateBackup(rawJson: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checksum = computeChecksum(rawJson);

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      valid: false,
      errors: ['El archivo no es un JSON válido'],
      warnings: [],
      summary: { tables: 0, rows: 0, checksum, version: '', exportedAt: '' },
    };
  }

  const { errors: manifestErrors, version } = validateManifest(parsed);
  errors.push(...manifestErrors);

  const expectedTables = getBackupTables(version);

  const p = parsed as Record<string, unknown>;

  const dataErrors = validateDataStructure(p.data, expectedTables);
  errors.push(...dataErrors);

  if (dataErrors.length === 0) {
    const data = p.data as Record<string, unknown[]>;

    if (typeof p.data === 'object' && p.data !== null) {
      const rowCountErrors = validateRowCounts(parsed, expectedTables);
      errors.push(...rowCountErrors);

      const duplicateErrors = validateDuplicateIds(data);
      errors.push(...duplicateErrors);

      const fkErrors = validateForeignKeys(data);
      errors.push(...fkErrors);

      const emptyTables = expectedTables.filter(t => (data[t]?.length ?? 0) === 0);
      if (emptyTables.length > 0) {
        warnings.push(`Las siguientes tablas están vacías: ${emptyTables.join(', ')}`);
      }
    }
  }

  const m = p.manifest as Record<string, string> | undefined;
  const exportedAt = m?.exportedAt as string ?? '';

  const allData = p.data as Record<string, unknown[]> | undefined;
  let totalRows = 0;
  let tableCount = 0;
  if (allData && typeof allData === 'object') {
    for (const arr of Object.values(allData)) {
      if (Array.isArray(arr)) {
        totalRows += arr.length;
        tableCount++;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      tables: tableCount,
      rows: totalRows,
      checksum,
      version,
      exportedAt,
    },
  };
}
