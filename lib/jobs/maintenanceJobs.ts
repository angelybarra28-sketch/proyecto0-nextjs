import { validateRuntimeContract } from '@/lib/repositories/runtimeContractRepository';
import { listAllProducts } from '@/lib/repositories/productRepository';
import { getAdminDashboardAnalytics } from '@/lib/services/admin/analytics';
import { refreshAdminFinancialStatuses } from '@/lib/services/adminSalesService';
import { getProductImagePathFromPublicUrl, getProductImagesBucket } from '@/lib/storage/productImageStorage';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export type MaintenanceJobName =
  | 'cleanup_orphan_product_images'
  | 'cleanup_stale_uploads'
  | 'refresh_financial_statuses'
  | 'refresh_dashboard_analytics'
  | 'validate_runtime_contract'
  | 'audit_log_retention';

export type MaintenanceJobResult = {
  jobName: MaintenanceJobName;
  success: boolean;
  message: string;
  dryRun: boolean;
  details?: unknown;
};

type MaintenanceJobOptions = {
  dryRun?: boolean;
};

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function result(jobName: MaintenanceJobName, message: string, details?: unknown, dryRun = true): MaintenanceJobResult {
  return { jobName, success: true, message, details, dryRun };
}

function requireSupabase() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase admin client unavailable');
  }

  return supabase;
}

async function listStoragePaths(prefix = ''): Promise<string[]> {
  const supabase = requireSupabase();
  const bucket = getProductImagesBucket();
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });

  if (error) throw error;

  const paths: string[] = [];

  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id) {
      paths.push(path);
      continue;
    }

    paths.push(...await listStoragePaths(path));
  }

  return paths;
}

async function collectProductImagePaths(): Promise<Set<string>> {
  const products = await listAllProducts(requireSupabase());
  const paths = new Set<string>();

  for (const product of products) {
    const urls = [product.image_url, ...toStringArray(product.carousel_images)].filter((url): url is string => Boolean(url));

    for (const url of urls) {
      const path = getProductImagePathFromPublicUrl(url);
      if (path) paths.add(path);
    }
  }

  return paths;
}

async function cleanupOrphanProductImages(options: MaintenanceJobOptions): Promise<MaintenanceJobResult> {
  const dbPaths = await collectProductImagePaths();
  const storagePaths = await listStoragePaths();
  const orphanPaths = storagePaths.filter((path) => !dbPaths.has(path));

  return result('cleanup_orphan_product_images', 'Orphan product images detected; no files deleted', {
    orphanCount: orphanPaths.length,
    orphanPaths,
  }, options.dryRun ?? true);
}

async function cleanupStaleUploads(options: MaintenanceJobOptions): Promise<MaintenanceJobResult> {
  return result('cleanup_stale_uploads', 'Stale upload cleanup scaffold ready; no files deleted', {
    strategy: 'Future cron can delete temporary upload prefixes older than a retention window.',
  }, options.dryRun ?? true);
}

async function validateRuntimeContractJob(options: MaintenanceJobOptions): Promise<MaintenanceJobResult> {
  const status = await validateRuntimeContract(requireSupabase());

  return {
    jobName: 'validate_runtime_contract',
    success: status.ok,
    message: status.ok ? 'Runtime contract is valid' : 'RUNTIME_CONTRACT_INVALID',
    dryRun: options.dryRun ?? true,
    details: status,
  };
}

async function auditLogRetention(options: MaintenanceJobOptions): Promise<MaintenanceJobResult> {
  return result('audit_log_retention', 'Audit log retention scaffold ready; no rows deleted', {
    strategy: 'Future cron can archive/delete audit logs after a configured retention window.',
  }, options.dryRun ?? true);
}

export async function runMaintenanceJob(jobName: MaintenanceJobName, options: MaintenanceJobOptions = {}): Promise<MaintenanceJobResult> {
  if (jobName === 'cleanup_orphan_product_images') return cleanupOrphanProductImages(options);
  if (jobName === 'cleanup_stale_uploads') return cleanupStaleUploads(options);

  if (jobName === 'refresh_financial_statuses') {
    await refreshAdminFinancialStatuses();
    return result(jobName, 'Financial statuses refreshed', undefined, false);
  }

  if (jobName === 'refresh_dashboard_analytics') {
    await getAdminDashboardAnalytics();
    return result(jobName, 'Dashboard analytics refreshed', undefined, false);
  }

  if (jobName === 'validate_runtime_contract') return validateRuntimeContractJob(options);
  return auditLogRetention(options);
}
