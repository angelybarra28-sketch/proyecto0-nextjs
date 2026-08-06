import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { exportBackup } from './export.service';
import { validateBackup } from './validate.service';
import { getRestorePayloadError, getMaxRestorePayloadMb } from './restoreConfig';
import type { BackupPayload } from './types';

export type RestoreMode = 'merge' | 'replace';

export interface RestoreTableStats {
  table: string;
  backupRows: number;
  inserted: number;
  updated: number;
  ignored: number;
}

export interface RestoreResult {
  success: boolean;
  mode: RestoreMode;
  version: string;
  checksum: string;
  durationMs: number;
  tables: RestoreTableStats[];
  totalInserted: number;
  totalUpdated: number;
  totalIgnored: number;
  warnings: string[];
  errors: string[];
  snapshot?: BackupPayload;
  rollbackApplied: boolean;
}

export class RestoreError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'RestoreError';
    this.status = status;
  }
}

const INSERT_ORDER: string[] = [
  'categories',
  'products',
  'product_categories',
  'customers',
  'sales',
  'sale_items',
  'installments',
  'payments',
  'payment_allocations',
  'credit_accounts',
  'credit_account_items',
  'credit_installments',
  'credit_payments',
  'credit_payment_allocations',
  'credit_collection_notes',
  'proveedores',
  'proveedor_compras',
  'proveedor_compra_items',
  'proveedor_pagos',
  'proveedor_adjuntos',
  'product_price_history',
  'profiles',
  'admin_audit_logs',
];

const DELETE_ORDER: string[] = [
  'admin_audit_logs',
  'profiles',
  'product_price_history',
  'proveedor_adjuntos',
  'proveedor_compra_items',
  'proveedor_pagos',
  'proveedor_compras',
  'proveedores',
  'credit_payment_allocations',
  'credit_installments',
  'credit_payments',
  'credit_collection_notes',
  'credit_account_items',
  'credit_accounts',
  'payment_allocations',
  'payments',
  'installments',
  'sale_items',
  'sales',
  'product_categories',
  'products',
  'customers',
  'categories',
];

const PK_COLUMNS: Record<string, string> = {
  categories: 'id',
  products: 'id',
  product_categories: 'product_id,category_id',
  customers: 'id',
  profiles: 'user_id',
  sales: 'id',
  sale_items: 'id',
  installments: 'id',
  payments: 'id',
  payment_allocations: 'id',
  credit_accounts: 'id',
  credit_account_items: 'id',
  credit_installments: 'id',
  credit_payments: 'id',
  credit_payment_allocations: 'id',
  credit_collection_notes: 'id',
  proveedores: 'id',
  proveedor_compras: 'id',
  proveedor_compra_items: 'id',
  proveedor_pagos: 'id',
  proveedor_adjuntos: 'id',
  admin_audit_logs: 'id',
  product_price_history: 'id',
};

const DELETE_FILTER_COLUMN: Record<string, string> = {
  profiles: 'user_id',
  product_categories: 'product_id',
};

const AUTH_REFERENCE_COLUMNS: Record<string, string> = {
  profiles: 'user_id',
  customers: 'user_id',
  admin_audit_logs: 'admin_user_id',
  products: 'deleted_by',
  product_price_history: 'changed_by',
};

const CHUNK_SIZE = 200;
const FAKE_UUID = '00000000-0000-0000-0000-000000000000';

type Row = Record<string, unknown>;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function rowKey(row: Row, pkCols: string[]): string {
  return pkCols.map((col) => String(row[col] ?? '')).join('|');
}

async function loadExistingAuthUserIds(supabase: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();

  try {
    let page = 1;
    const perPage = 1000;

    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw error;
      }
      for (const user of data?.users ?? []) {
        ids.add(user.id);
      }
      const total = data?.total ?? 0;
      if (page * perPage >= total) {
        break;
      }
      page++;
    }
  } catch (error) {
    console.error('Error listing auth users for restore:', error);
    throw new RestoreError('No se pudo verificar auth.users antes de restaurar. Restore cancelado sin modificar la base.');
  }

  return ids;
}

function sanitizeAuthReferences(
  table: string,
  rows: Row[],
  existingAuthIds: Set<string>
): { rows: Row[]; warnings: string[] } {
  const authColumn = AUTH_REFERENCE_COLUMNS[table];
  if (!authColumn) {
    return { rows, warnings: [] };
  }

  const warnings: string[] = [];
  const sanitized: Row[] = [];

  for (const row of rows) {
    const value = row[authColumn];

    if (value === null || value === undefined) {
      sanitized.push(row);
      continue;
    }

    if (existingAuthIds.has(String(value))) {
      sanitized.push(row);
      continue;
    }

    if (table === 'profiles') {
      warnings.push(
        `profiles: fila con user_id "${String(value)}" omitida porque el usuario no existe en auth.users`
      );
      continue;
    }

    warnings.push(
      `${table}: referencia a auth.users "${String(value)}" no encontrada; se guardó NULL en "${authColumn}"`
    );
    sanitized.push({ ...row, [authColumn]: null });
  }

  return { rows: sanitized, warnings };
}

async function fetchExistingPkIds(supabase: SupabaseClient, table: string, pkCols: string[]): Promise<Set<string>> {
  const ids = new Set<string>();
  const selectColumns = pkCols.join(',');
  const orderColumn = pkCols[0];
  const chunkSize = 1000;
  let start = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(selectColumns)
      .order(orderColumn, { ascending: true })
      .range(start, start + chunkSize - 1);

    if (error) {
      console.error(`Error reading existing PKs for "${table}":`, error);
      return ids;
    }

    const rows = (data ?? []) as unknown as Row[];
    for (const row of rows) {
      ids.add(rowKey(row, pkCols));
    }

    if (rows.length < chunkSize) {
      break;
    }
    start += chunkSize;
  }

  return ids;
}

async function validateSchemaCompatibility(
  supabase: SupabaseClient,
  payload: BackupPayload
): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [table, rows] of Object.entries(payload.data)) {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', table);

    if (error || !data) {
      errors.push(`schema: no se pudo consultar las columnas de "${table}"`);
      continue;
    }

    const liveColumns = new Set<string>();
    const requiredColumns = new Set<string>();

    for (const column of data as Array<{ column_name: string; is_nullable: string; column_default: string | null }>) {
      liveColumns.add(column.column_name);
      if (column.is_nullable === 'NO' && !column.column_default) {
        requiredColumns.add(column.column_name);
      }
    }

    for (const row of rows as Row[]) {
      for (const key of Object.keys(row)) {
        if (!liveColumns.has(key)) {
          errors.push(`schema: ${table} contiene la columna "${key}" que no existe en la base de datos`);
        }
      }
      for (const required of requiredColumns) {
        if (row[required] === undefined) {
          errors.push(`schema: fila de "${table}" no tiene la columna obligatoria "${required}"`);
        }
      }
    }

    const missingColumns = [...requiredColumns].filter((column) => {
      return (rows as Row[]).every((row) => row[column] === undefined);
    });
    for (const column of missingColumns) {
      warnings.push(`schema: la columna "${column}" de "${table}" no está en el backup y quedará con su valor por defecto`);
    }
  }

  return { errors, warnings };
}

async function deleteAllRows(supabase: SupabaseClient, table: string): Promise<Error | null> {
  const filterColumn = DELETE_FILTER_COLUMN[table] ?? 'id';
  const { error } = await supabase.from(table).delete().neq(filterColumn, FAKE_UUID);
  return error ?? null;
}

function countRow(row: Row, pkCols: string[], existingIds: Set<string>, stats: RestoreTableStats): void {
  const key = rowKey(row, pkCols);
  if (existingIds.has(key)) {
    stats.updated++;
  } else {
    stats.inserted++;
  }
}

async function upsertRows(supabase: SupabaseClient, table: string, rows: Row[]): Promise<Error | null> {
  const onConflict = PK_COLUMNS[table];
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  return error ?? null;
}

async function mergeTable(
  supabase: SupabaseClient,
  table: string,
  fileRows: Row[],
  existingAuthIds: Set<string>
): Promise<{ stats: RestoreTableStats; warnings: string[] }> {
  const stats: RestoreTableStats = {
    table,
    backupRows: fileRows.length,
    inserted: 0,
    updated: 0,
    ignored: 0,
  };

  if (fileRows.length === 0) {
    return { stats, warnings: [] };
  }

  const { rows: sanitized, warnings } = sanitizeAuthReferences(table, fileRows, existingAuthIds);
  const pkCols = PK_COLUMNS[table].split(',');
  const existingIds = await fetchExistingPkIds(supabase, table, pkCols);

  if (sanitized.length === 0) {
    stats.ignored = fileRows.length;
    return { stats, warnings };
  }

  const countSucceeded = (rows: Row[]) => {
    for (const row of rows) {
      countRow(row, pkCols, existingIds, stats);
    }
  };

  const wholeTableError = await upsertRows(supabase, table, sanitized);

  if (!wholeTableError) {
    countSucceeded(sanitized);
    return { stats, warnings };
  }

  for (const group of chunk(sanitized, CHUNK_SIZE)) {
    const groupError = await upsertRows(supabase, table, group);

    if (!groupError) {
      countSucceeded(group);
      continue;
    }

    for (const row of group) {
      const rowError = await upsertRows(supabase, table, [row]);
      if (rowError) {
        throw new Error(`merge ${table}: ${rowError.message}`);
      }
      countRow(row, pkCols, existingIds, stats);
    }
  }

  return { stats, warnings };
}

async function insertTable(
  supabase: SupabaseClient,
  table: string,
  rows: Row[],
  existingAuthIds: Set<string>,
  onWarning: (message: string) => void
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const { rows: sanitized, warnings } = sanitizeAuthReferences(table, rows, existingAuthIds);
  for (const warning of warnings) {
    onWarning(warning);
  }

  for (const group of chunk(sanitized, CHUNK_SIZE)) {
    const { error } = await supabase.from(table).insert(group);
    if (error) {
      throw new Error(`restore ${table}: ${error.message}`);
    }
  }

  return sanitized.length;
}

async function clearAllData(supabase: SupabaseClient): Promise<Error | null> {
  for (const table of DELETE_ORDER) {
    const error = await deleteAllRows(supabase, table);
    if (error) {
      return error;
    }
  }
  return null;
}

async function importData(
  supabase: SupabaseClient,
  payload: BackupPayload,
  existingAuthIds: Set<string>,
  warnings: string[]
): Promise<void> {
  for (const table of INSERT_ORDER) {
    const rows = (payload.data[table] ?? []) as Row[];
    await insertTable(supabase, table, rows, existingAuthIds, (message) => warnings.push(message));
  }
}

function aggregate(stats: RestoreTableStats[]): {
  totalInserted: number;
  totalUpdated: number;
  totalIgnored: number;
} {
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalIgnored = 0;

  for (const entry of stats) {
    totalInserted += entry.inserted;
    totalUpdated += entry.updated;
    totalIgnored += entry.ignored;
  }

  return { totalInserted, totalUpdated, totalIgnored };
}

export interface RestoreOptions {
  mode: RestoreMode;
  rawJson: string;
  checksum: string;
}

export async function restoreBackup(options: RestoreOptions): Promise<RestoreResult> {
  const startedAt = Date.now();
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new RestoreError('Supabase admin client not available', 500);
  }

  const maxMb = getMaxRestorePayloadMb();
  const payloadError = getRestorePayloadError(options.rawJson, maxMb);
  if (payloadError) {
    throw new RestoreError(payloadError, 413);
  }

  const validation = validateBackup(options.rawJson);
  if (!validation.valid) {
    throw new RestoreError(`El backup no es válido: ${validation.errors.join('; ')}`);
  }

  const payload = JSON.parse(options.rawJson) as BackupPayload;
  const version = payload.manifest?.version ?? validation.summary.version;

  const schema = await validateSchemaCompatibility(supabase, payload);
  if (schema.errors.length > 0) {
    throw new RestoreError(`El backup no es compatible con el schema actual: ${schema.errors.join('; ')}`);
  }

  const existingAuthIds = await loadExistingAuthUserIds(supabase);

  const warnings: string[] = [...validation.warnings, ...schema.warnings];

  const result: RestoreResult = {
    success: false,
    mode: options.mode,
    version,
    checksum: options.checksum,
    durationMs: 0,
    tables: [],
    totalInserted: 0,
    totalUpdated: 0,
    totalIgnored: 0,
    warnings,
    errors: [],
    rollbackApplied: false,
  };

  let snapshot: BackupPayload;
  try {
    snapshot = await exportBackup();
  } catch (error) {
    console.error('Error generating restore snapshot:', error);
    throw new RestoreError(
      'No se pudo generar el snapshot de seguridad antes del restore. Restore cancelado sin modificar la base.',
      500
    );
  }

  const applyRollback = async (failureMessage: string) => {
    result.rollbackApplied = true;
    result.errors.push(failureMessage);
    try {
      await clearAllData(supabase);
      await importData(supabase, snapshot, existingAuthIds, warnings);
      warnings.push('Rollback aplicado: la base fue restaurada al estado anterior al restore.');
    } catch (rollbackError) {
      result.errors.push(
        `Rollback falló: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}. ` +
          'Descargá el snapshot de seguridad para restaurar manualmente.'
      );
    }
  };

  const stats: RestoreTableStats[] = INSERT_ORDER.map((table) => ({
    table,
    backupRows: (payload.data[table] ?? []).length,
    inserted: 0,
    updated: 0,
    ignored: 0,
  }));

  try {
    if (options.mode === 'merge') {
      for (const table of INSERT_ORDER) {
        const fileRows = (payload.data[table] ?? []) as Row[];
        const outcome = await mergeTable(supabase, table, fileRows, existingAuthIds);
        const tableStats = stats.find((entry) => entry.table === table);
        if (tableStats) {
          tableStats.inserted = outcome.stats.inserted;
          tableStats.updated = outcome.stats.updated;
          tableStats.ignored = outcome.stats.ignored;
        }
        warnings.push(...outcome.warnings);
      }
    } else {
      const clearError = await clearAllData(supabase);
      if (clearError) {
        throw new Error(`Error al vaciar la base: ${clearError.message}`);
      }
      for (const table of INSERT_ORDER) {
        const rows = (payload.data[table] ?? []) as Row[];
        const inserted = await insertTable(supabase, table, rows, existingAuthIds, (message) => warnings.push(message));
        const tableStats = stats.find((entry) => entry.table === table);
        if (tableStats) {
          tableStats.inserted = inserted;
          tableStats.ignored = Math.max(0, tableStats.backupRows - inserted);
        }
      }
    }

    result.tables = stats;
    result.success = true;
    Object.assign(result, aggregate(stats));
  } catch (error) {
    result.tables = stats;
    await applyRollback(error instanceof Error ? error.message : String(error));
  }

  if (options.mode === 'replace') {
    result.snapshot = snapshot;
  }

  result.durationMs = Date.now() - startedAt;

  return result;
}
