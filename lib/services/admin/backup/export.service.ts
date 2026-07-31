import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { buildManifest } from './manifest';
import { BACKUP_TABLES } from './types';
import type { BackupPayload } from './types';

const ROW_CHUNK_SIZE = 1000;

const ORDER_COLUMNS_BY_TABLE: Record<string, string[]> = {
  product_categories: ['product_id', 'category_id'],
  profiles: ['user_id'],
};

async function fetchTableRows(supabase: SupabaseClient, table: string): Promise<unknown[]> {
  const orderColumns = ORDER_COLUMNS_BY_TABLE[table] ?? ['id'];

  let builder = supabase.from(table).select('*');
  for (const column of orderColumns) {
    builder = builder.order(column, { ascending: true });
  }

  const allRows: unknown[] = [];
  let start = 0;

  for (;;) {
    const { data, error } = await builder.range(start, start + ROW_CHUNK_SIZE - 1);
    if (error) {
      throw new Error(`Failed to export table "${table}": ${error.message}`);
    }
    const rows = data ?? [];
    allRows.push(...rows);
    if (rows.length < ROW_CHUNK_SIZE) {
      break;
    }
    start += ROW_CHUNK_SIZE;
  }

  return allRows;
}

export async function exportBackup(): Promise<BackupPayload> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase admin client not available');
  }

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const appVersion = process.env.npm_package_version ?? '0.0.0';

  const results = await Promise.all(
    BACKUP_TABLES.map(async (table) => {
      const rows = await fetchTableRows(supabase, table);
      return { table, rows };
    }),
  );

  const data: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};

  for (const { table, rows } of results) {
    data[table] = rows;
    rowCounts[table] = rows.length;
  }

  const manifest = buildManifest(
    [...BACKUP_TABLES],
    rowCounts,
    projectUrl,
    appVersion,
  );

  return { manifest, data };
}
