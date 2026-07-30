import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { buildManifest } from './manifest';
import type { BackupPayload } from './types';

const TABLES = [
  'categories',
  'products',
  'product_categories',
  'customers',
  'profiles',
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
  'admin_audit_logs',
] as const;

export async function exportBackup(): Promise<BackupPayload> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase admin client not available');
  }

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const appVersion = process.env.npm_package_version ?? '0.0.0';

  const results = await Promise.all(
    TABLES.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        throw new Error(`Failed to export table "${table}": ${error.message}`);
      }
      return { table, rows: data ?? [] };
    }),
  );

  const data: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};

  for (const { table, rows } of results) {
    data[table] = rows;
    rowCounts[table] = rows.length;
  }

  const manifest = buildManifest(
    [...TABLES],
    rowCounts,
    projectUrl,
    appVersion,
  );

  return { manifest, data };
}
