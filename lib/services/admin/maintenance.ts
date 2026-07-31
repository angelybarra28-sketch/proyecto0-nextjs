import type { SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { countTrashedProducts } from '@/lib/repositories/productRepository';
import { queryBackupHistory } from '@/lib/services/admin/backup/history.service';
import { BACKUP_VERSION } from '@/lib/services/admin/backup/types';
import { getProductImagePathFromPublicUrl } from '@/lib/storage/productImageStorage';

export type MaintenanceStatus = 'ok' | 'warning' | 'error';

export type MaintenanceSystemStatus = {
  counts: {
    products: number;
    categories: number;
    customers: number;
    sales: number;
    creditAccounts: number;
    proveedores: number;
  };
  backups: {
    lastBackup: string | null;
    lastRestore: string | null;
    backupCount: number;
    restoreCount: number;
  };
  trash: {
    productsInTrash: number;
  };
  audit: {
    logCount: number;
    lastAction: string | null;
    lastActionUser: string | null;
    lastActionDate: string | null;
  };
};

export type MaintenanceDiagnostic = {
  key: string;
  label: string;
  count: number;
  status: MaintenanceStatus;
  detail?: string;
  action?: { label: string; href: string };
};

export type MaintenanceSystemInfo = {
  appVersion: string;
  backupVersion: string;
  tableCount: number;
  apiRouteCount: number;
  buildDate: string | null;
  environment: string;
  supabaseProject: string | null;
};

export type MaintenanceStatusResponse = {
  status: MaintenanceSystemStatus;
  diagnostics: MaintenanceDiagnostic[];
  systemInfo: MaintenanceSystemInfo;
};

export type StorageCheckBucket = {
  bucket: string;
  exists: boolean;
  objects: number;
  referencedInDb: number;
  status: MaintenanceStatus;
  detail: string;
};

export type StorageCheckResult = {
  buckets: StorageCheckBucket[];
  status: MaintenanceStatus;
  totalObjects: number;
  totalReferenced: number;
};

export type MaintenanceAction =
  | 'financial_refresh'
  | 'credit_overdue_refresh'
  | 'storage_check'
  | 'cache_clear'
  | 'diagnostics';

export type MaintenanceActionResult = {
  success: boolean;
  message: string;
  result?: unknown;
};

async function listAllStorageObjects(supabase: SupabaseClient, bucket: string, cap = 5000): Promise<string[]> {
  const paths: string[] = [];
  const stack: string[] = [''];

  while (stack.length > 0 && paths.length <= cap) {
    const prefix = stack.pop() as string;
    let offset = 0;

    for (;;) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100, offset });

      if (error) {
        throw error;
      }

      const items = data ?? [];
      if (items.length === 0) break;

      for (const item of items) {
        if (item.id) {
          paths.push(prefix + item.name);
        } else {
          stack.push(prefix + item.name + '/');
        }
      }

      offset += items.length;
      if (items.length < 100) break;
    }
  }

  return paths.slice(0, cap);
}

async function checkStorage(supabase: SupabaseClient): Promise<StorageCheckResult> {
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    throw bucketsError;
  }

  const expectedBuckets = ['product-images', 'proveedor-adjuntos'];
  const existingNames = new Set((buckets ?? []).map((b) => b.name));

  const [adjuntosRes, productImagesRes] = await Promise.all([
    supabase.from('proveedor_adjuntos').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('image_url, carousel_images'),
  ]);

  const referencedAdjuntos = adjuntosRes.count ?? 0;

  const referencedPaths = new Set<string>();
  for (const product of (productImagesRes.data ?? []) as Array<{ image_url: string | null; carousel_images: unknown }>) {
    if (product.image_url) {
      const path = getProductImagePathFromPublicUrl(product.image_url);
      if (path) referencedPaths.add(path);
    }
    const carousel = Array.isArray(product.carousel_images) ? product.carousel_images : [];
    for (const url of carousel) {
      if (typeof url === 'string') {
        const path = getProductImagePathFromPublicUrl(url);
        if (path) referencedPaths.add(path);
      }
    }
  }

  const bucketsInfo: StorageCheckBucket[] = [];

  for (const bucket of expectedBuckets) {
    const exists = existingNames.has(bucket);

    let objects = 0;
    if (exists) {
      try {
        objects = (await listAllStorageObjects(supabase, bucket)).length;
      } catch (error) {
        bucketsInfo.push({
          bucket,
          exists: true,
          objects: 0,
          referencedInDb: 0,
          status: 'error',
          detail: `No se pudo listar: ${error instanceof Error ? error.message : 'error desconocido'}`,
        });
        continue;
      }
    }

    const referencedInDb = bucket === 'proveedor-adjuntos' ? referencedAdjuntos : referencedPaths.size;

    let status: MaintenanceStatus = 'ok';
    let detail = 'Consistente';

    if (!exists) {
      status = 'error';
      detail = 'Bucket no encontrado';
    } else if (referencedInDb > 0 && objects === 0) {
      status = 'error';
      detail = 'Hay referencias en la base pero ningún archivo en storage';
    } else if (objects > 0 && referencedInDb === 0) {
      status = 'warning';
      detail = 'Hay archivos sin referencias en la base (posibles huérfanos)';
    }

    bucketsInfo.push({ bucket, exists, objects, referencedInDb, status, detail });
  }

  const totalObjects = bucketsInfo.reduce((sum, b) => sum + b.objects, 0);
  const totalReferenced = bucketsInfo.reduce((sum, b) => sum + b.referencedInDb, 0);

  return {
    buckets: bucketsInfo,
    status: bucketsInfo.some((b) => b.status === 'error') ? 'error' : bucketsInfo.some((b) => b.status === 'warning') ? 'warning' : 'ok',
    totalObjects,
    totalReferenced,
  };
}

async function countProductsWithoutCategory(supabase: SupabaseClient): Promise<number> {
  const [productsRes, junctionRes] = await Promise.all([
    supabase.from('products').select('id, category_id').is('deleted_at', null),
    supabase.from('product_categories').select('product_id'),
  ]);

  const junctionIds = new Set((junctionRes.data ?? []).map((r) => r.product_id));
  return (productsRes.data ?? []).filter((p) => !p.category_id && !junctionIds.has(p.id)).length;
}

async function countDuplicateSlugs(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.from('products').select('slug').is('deleted_at', null);
  const counts = new Map<string, number>();

  for (const row of data ?? []) {
    counts.set(row.slug, (counts.get(row.slug) ?? 0) + 1);
  }

  return [...counts.values()].filter((c) => c > 1).reduce((sum, c) => sum + c, 0);
}

async function countProductsWithoutImage(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.from('products').select('id, image_url, carousel_images').is('deleted_at', null);

  return (data ?? []).filter((p) => {
    const carousel = Array.isArray(p.carousel_images) ? p.carousel_images : [];
    return !p.image_url && carousel.length === 0;
  }).length;
}

async function countCategoriesWithoutProducts(supabase: SupabaseClient): Promise<number> {
  const [categoriesRes, productsRes, junctionRes] = await Promise.all([
    supabase.from('categories').select('id'),
    supabase.from('products').select('category_id').is('deleted_at', null),
    supabase.from('product_categories').select('category_id'),
  ]);

  const used = new Set<string>();
  for (const p of productsRes.data ?? []) {
    if (p.category_id) used.add(p.category_id);
  }
  for (const j of junctionRes.data ?? []) {
    if (j.category_id) used.add(j.category_id);
  }

  return (categoriesRes.data ?? []).filter((c) => !used.has(c.id)).length;
}

async function countCustomersWithoutSales(supabase: SupabaseClient): Promise<number> {
  const [customersRes, salesRes] = await Promise.all([
    supabase.from('customers').select('id'),
    supabase.from('sales').select('customer_id'),
  ]);

  const withSales = new Set((salesRes.data ?? []).map((s) => s.customer_id));
  return (customersRes.data ?? []).filter((c) => !withSales.has(c.id)).length;
}

async function getCreditInconsistency(supabase: SupabaseClient): Promise<{ count: number; detail: string; status: MaintenanceStatus }> {
  const { data, error } = await supabase.rpc('get_credit_clean_summary');

  if (error) {
    return { count: 0, detail: 'No se pudo consultar la lógica existente', status: 'error' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const accounts = Number(row?.account_count ?? 0);
  const installments = Number(row?.installment_count ?? 0);
  const payments = Number(row?.payment_count ?? 0);
  const allocations = Number(row?.allocation_count ?? 0);
  const total = accounts + installments + payments + allocations;

  return {
    count: total,
    detail: `cuentas: ${accounts} · cuotas: ${installments} · pagos: ${payments} · asignaciones: ${allocations}`,
    status: total > 0 ? 'warning' : 'ok',
  };
}

async function countComprasSinFactura(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.from('proveedor_compras').select('id, numero_factura');
  return (data ?? []).filter((c) => !c.numero_factura || c.numero_factura.trim() === '').length;
}

async function countOrphanAdjuntos(supabase: SupabaseClient): Promise<number> {
  const [adjuntosRes, comprasRes] = await Promise.all([
    supabase.from('proveedor_adjuntos').select('compra_id'),
    supabase.from('proveedor_compras').select('id'),
  ]);

  const compraIds = new Set((comprasRes.data ?? []).map((c) => c.id));
  return (adjuntosRes.data ?? []).filter((a) => !compraIds.has(a.compra_id)).length;
}

async function countTrashWithHistory(supabase: SupabaseClient): Promise<number> {
  const { data: trashed } = await supabase.from('products').select('id').not('deleted_at', 'is', null);

  if (!trashed || trashed.length === 0) {
    return 0;
  }

  const ids = trashed.map((t) => t.id);
  const matching = new Set<string>();

  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const { data } = await supabase.from('product_price_history').select('product_id').in('product_id', chunk);
    for (const row of data ?? []) {
      matching.add(row.product_id);
    }
  }

  return matching.size;
}

async function getAuditInfo(supabase: SupabaseClient) {
  const [countRes, lastRes] = await Promise.all([
    supabase.from('admin_audit_logs').select('id', { count: 'exact', head: true }),
    supabase.from('admin_audit_logs')
      .select('admin_user_id, action, created_at')
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const last = lastRes.data?.[0] ?? null;
  let lastActionUser: string | null = null;

  if (last?.admin_user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', last.admin_user_id)
      .maybeSingle();

    lastActionUser = profile?.full_name ?? null;
  }

  return {
    logCount: countRes.count ?? 0,
    lastAction: last?.action ?? null,
    lastActionUser,
    lastActionDate: last?.created_at ?? null,
  };
}

let cachedApiRouteCount: number | null = null;
let cachedBuildDate: string | null = null;

function countApiRoutes(dir: string): number {
  if (cachedApiRouteCount !== null) {
    return cachedApiRouteCount;
  }

  let count = 0;
  const walk = (current: string): void => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
        count += 1;
      }
    }
  };

  walk(dir);
  cachedApiRouteCount = count;
  return count;
}

function getBuildDate(): string | null {
  if (cachedBuildDate !== null) {
    return cachedBuildDate;
  }

  try {
    readFileSync(join(process.cwd(), '.next', 'BUILD_ID'), 'utf8');
    const stat = statSync(join(process.cwd(), '.next', 'BUILD_ID'));
    cachedBuildDate = new Date(stat.mtime).toISOString();
  } catch {
    cachedBuildDate = null;
  }

  return cachedBuildDate;
}

function getSupabaseProject(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

export async function getMaintenanceStatus(): Promise<MaintenanceStatusResponse> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const [productsRes, categoriesRes, customersRes, salesRes, creditRes, proveedoresRes, backupHistory, trashCount, audit] =
    await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('sales').select('id', { count: 'exact', head: true }),
      supabase.from('credit_accounts').select('id', { count: 'exact', head: true }),
      supabase.from('proveedores').select('id', { count: 'exact', head: true }),
      queryBackupHistory(),
      countTrashedProducts(supabase),
      getAuditInfo(supabase),
    ]);

  const status: MaintenanceSystemStatus = {
    counts: {
      products: productsRes.count ?? 0,
      categories: categoriesRes.count ?? 0,
      customers: customersRes.count ?? 0,
      sales: salesRes.count ?? 0,
      creditAccounts: creditRes.count ?? 0,
      proveedores: proveedoresRes.count ?? 0,
    },
    backups: {
      lastBackup: backupHistory.stats.lastBackup,
      lastRestore: backupHistory.stats.lastRestore,
      backupCount: backupHistory.stats.backupCount,
      restoreCount: backupHistory.stats.restoreCount,
    },
    trash: {
      productsInTrash: trashCount,
    },
    audit,
  };

  return {
    status,
    diagnostics: await getMaintenanceDiagnostics(),
    systemInfo: await getMaintenanceSystemInfo(),
  };
}

export async function getMaintenanceDiagnostics(): Promise<MaintenanceDiagnostic[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const [
    productsWithoutCategory,
    duplicateSlugs,
    productsWithoutImage,
    categoriesWithoutProducts,
    customersWithoutSales,
    creditInconsistency,
    comprasSinFactura,
    orphanAdjuntos,
    trashWithHistory,
  ] = await Promise.all([
    countProductsWithoutCategory(supabase),
    countDuplicateSlugs(supabase),
    countProductsWithoutImage(supabase),
    countCategoriesWithoutProducts(supabase),
    countCustomersWithoutSales(supabase),
    getCreditInconsistency(supabase),
    countComprasSinFactura(supabase),
    countOrphanAdjuntos(supabase),
    countTrashWithHistory(supabase),
  ]);

  return [
    {
      key: 'products_without_category',
      label: 'Productos sin categoría',
      count: productsWithoutCategory,
      status: productsWithoutCategory > 0 ? 'warning' : 'ok',
      action: productsWithoutCategory > 0 ? { label: 'Ver productos', href: '/admin/productos' } : undefined,
    },
    {
      key: 'duplicate_slugs',
      label: 'Productos duplicados por slug',
      count: duplicateSlugs,
      status: duplicateSlugs > 0 ? 'error' : 'ok',
    },
    {
      key: 'products_without_image',
      label: 'Productos sin imagen',
      count: productsWithoutImage,
      status: productsWithoutImage > 0 ? 'warning' : 'ok',
    },
    {
      key: 'categories_without_products',
      label: 'Categorías sin productos',
      count: categoriesWithoutProducts,
      status: categoriesWithoutProducts > 0 ? 'warning' : 'ok',
    },
    {
      key: 'customers_without_sales',
      label: 'Clientes sin ventas',
      count: customersWithoutSales,
      status: customersWithoutSales > 0 ? 'warning' : 'ok',
    },
    {
      key: 'credit_accounts_inconsistent',
      label: 'Cuentas corrientes inconsistentes',
      count: creditInconsistency.count,
      status: creditInconsistency.status,
      detail: creditInconsistency.detail,
    },
    {
      key: 'compras_sin_factura',
      label: 'Compras de proveedores sin factura',
      count: comprasSinFactura,
      status: comprasSinFactura > 0 ? 'warning' : 'ok',
    },
    {
      key: 'orphan_adjuntos',
      label: 'Adjuntos huérfanos',
      count: orphanAdjuntos,
      status: orphanAdjuntos > 0 ? 'error' : 'ok',
      detail: 'Archivos que apuntan a compras inexistentes',
    },
    {
      key: 'trash_with_history',
      label: 'Productos en papelera con historial',
      count: trashWithHistory,
      status: trashWithHistory > 0 ? 'warning' : 'ok',
      detail: 'Esperado si el producto tenía cambios de precio registrados',
    },
  ];
}

export async function getMaintenanceSystemInfo(): Promise<MaintenanceSystemInfo> {
  const supabase = getSupabaseAdminClient();

  const tablesRes = supabase
    ? await supabase
        .from('information_schema.tables')
        .select('table_name', { count: 'exact', head: true })
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE')
    : null;

  return {
    appVersion: process.env.npm_package_version ?? '0.0.0',
    backupVersion: BACKUP_VERSION,
    tableCount: tablesRes?.count ?? 0,
    apiRouteCount: countApiRoutes(join(process.cwd(), 'app', 'api')),
    buildDate: getBuildDate(),
    environment: process.env.NODE_ENV ?? 'development',
    supabaseProject: getSupabaseProject(),
  };
}

export async function runMaintenanceAction(action: MaintenanceAction): Promise<MaintenanceActionResult> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  switch (action) {
    case 'financial_refresh': {
      const { error } = await supabase.rpc('refresh_financial_statuses');
      if (error) throw error;
      return { success: true, message: 'Estados financieros recalculados correctamente' };
    }

    case 'credit_overdue_refresh': {
      const { error } = await supabase.rpc('refresh_credit_overdue');
      if (error) throw error;
      return { success: true, message: 'Mora recalculada correctamente' };
    }

    case 'storage_check': {
      const result = await checkStorage(supabase);
      return { success: true, message: 'Verificación de storage completada', result };
    }

    case 'cache_clear': {
      const { revalidateTag, revalidatePath } = await import('next/cache');
      revalidateTag('admin-dashboard-analytics', 'default');
      revalidatePath('/admin/dashboard');
      return { success: true, message: 'Caché del dashboard invalidada' };
    }

    case 'diagnostics': {
      const diagnostics = await getMaintenanceDiagnostics();
      return { success: true, message: 'Diagnóstico completado', result: { diagnostics } };
    }

    default:
      throw new Error(`Acción desconocida: ${action}`);
  }
}
