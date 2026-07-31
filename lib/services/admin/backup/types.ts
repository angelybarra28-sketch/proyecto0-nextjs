export const BACKUP_VERSION = '1.1';
export const SUPPORTED_BACKUP_VERSIONS = ['1.0', '1.1'] as const;
export type BackupVersion = (typeof SUPPORTED_BACKUP_VERSIONS)[number];

const BACKUP_TABLES_BASE = [
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

export const BACKUP_TABLES_V1_1 = [...BACKUP_TABLES_BASE, 'product_price_history'] as const;

export const BACKUP_TABLES = BACKUP_TABLES_V1_1;

export const BACKUP_TABLES_BASE_LIST: readonly string[] = BACKUP_TABLES_BASE;

export function getBackupTables(version: string | undefined): readonly string[] {
  if (version === '1.0') {
    return BACKUP_TABLES_BASE;
  }
  return BACKUP_TABLES_V1_1;
}

export interface BackupManifest {
  version: string;
  exportedAt: string;
  projectUrl: string;
  tables: string[];
  rowCounts: Record<string, number>;
  appVersion: string;
}

export interface BackupPayload {
  manifest: BackupManifest;
  data: Record<string, unknown[]>;
}
