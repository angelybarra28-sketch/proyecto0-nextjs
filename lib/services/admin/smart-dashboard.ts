import { unstable_cache } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { getAdminDashboardAnalytics } from '@/lib/services/admin/analytics';
import { getCreditDashboard } from '@/lib/services/creditAccountService';
import { getProveedorDashboard, getProveedorAlertas } from '@/lib/services/admin/proveedores';
import { queryBackupHistory } from '@/lib/services/admin/backup/history.service';
import type { BackupHistoryResponse } from '@/lib/services/admin/backup/history.service';
import { queryAuditLogs } from '@/lib/services/admin/auditService';
import type { AuditLogRow } from '@/lib/services/admin/auditService';
import { listRecentAdminSales } from '@/lib/services/admin/sales';
import { countTrashedProducts } from '@/lib/repositories/productRepository';
import { getMaintenanceStatus } from '@/lib/services/admin/maintenance';
import type { MaintenanceDiagnostic, MaintenanceStatus } from '@/lib/services/admin/maintenance';
import type {
  AdminDashboardStats,
  AdminSaleSummary,
  ProveedorAlerta,
  ProveedorDashboard,
} from '@/lib/supabase/types';

const CACHE_TAG = 'admin-dashboard-analytics';
const CACHE_REVALIDATE = 60;

export type CreditOverdueAggregate = {
  total: number;
  count: number;
};

export type RecentPriceChange = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string | null;
  oldPrice: number;
  newPrice: number;
  changedByName: string | null;
  reason: string | null;
  createdAt: string;
};

export type SmartDashboardDayStatus = {
  creditOverdue: CreditOverdueAggregate;
  comprasPendientes: { count: number; amount: number };
  trashProducts: number;
  lastBackup: { date: string | null; ageDays: number | null };
  system: { status: MaintenanceStatus; warnings: number; errors: number };
};

export type SmartDashboardQuickSummary = {
  monthSalesCount: number;
  monthSoldAmount: number;
  monthCollectedAmount: number;
  collectionPending: number;
  averageTicket: number;
  todaySalesCount: number;
  todaySoldAmount: number;
  monthlyGrowthPercentage: number;
};

export type SmartDashboardAlert = {
  id: string;
  level: 'error' | 'warning';
  title: string;
  description: string;
  count?: number;
  href: string;
};

export type SmartDashboardActivity = {
  recentSales: AdminSaleSummary[];
  priceChanges: RecentPriceChange[];
  recentBackups: AuditLogRow[];
  recentRestorations: AuditLogRow[];
  recentAudit: AuditLogRow[];
};

export type SmartDashboardCommercial = {
  currentMonthlyCollection: number;
  monthlyReplacement: number;
  replacementCount: number;
  finishedCards: number;
  finishedInstallmentsAmount: number;
  projectedNextMonth: number;
};

export type SmartDashboardResponse = {
  dayStatus: SmartDashboardDayStatus;
  quickSummary: SmartDashboardQuickSummary;
  alerts: SmartDashboardAlert[];
  activity: SmartDashboardActivity;
  detailed: {
    dashboard: AdminDashboardStats | null;
    commercial: SmartDashboardCommercial | null;
  };
};

const getCachedCreditDashboard = unstable_cache(
  async () => getCreditDashboard(),
  [CACHE_TAG, 'smart-credit-dashboard'],
  { revalidate: CACHE_REVALIDATE },
);

const getCachedCommercialMetrics = unstable_cache(
  async (): Promise<SmartDashboardCommercial | null> => getCommercialMetricsFromRpc(),
  [CACHE_TAG, 'smart-credit-commercial'],
  { revalidate: CACHE_REVALIDATE },
);

const getCachedProveedorDashboard = unstable_cache(
  async (): Promise<ProveedorDashboard> => getProveedorDashboard(),
  [CACHE_TAG, 'smart-proveedor-dashboard'],
  { revalidate: CACHE_REVALIDATE },
);

const getCachedProveedorAlertas = unstable_cache(
  async (): Promise<ProveedorAlerta[]> => getProveedorAlertas(),
  [CACHE_TAG, 'smart-proveedor-alertas'],
  { revalidate: CACHE_REVALIDATE },
);

const getCachedBackupHistory = unstable_cache(
  async (): Promise<BackupHistoryResponse> => queryBackupHistory(),
  [CACHE_TAG, 'smart-backup-history'],
  { revalidate: CACHE_REVALIDATE },
);

const getCachedMaintenanceStatus = unstable_cache(
  async () => getMaintenanceStatus(),
  [CACHE_TAG, 'smart-maintenance-status'],
  { revalidate: CACHE_REVALIDATE },
);

async function getCommercialMetricsFromRpc(): Promise<SmartDashboardCommercial | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_credit_commercial_metrics');

  if (error) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== 'object') {
    return null;
  }

  const now = new Date();
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();

  const { count } = await supabase
    .from('credit_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('origin_month', currentMonth)
    .eq('origin_year', currentYear);

  return {
    currentMonthlyCollection: Number(row.current_monthly_collection ?? 0),
    monthlyReplacement: Number(row.monthly_replacement ?? 0),
    replacementCount: Number(count ?? 0),
    finishedCards: Number(row.finished_cards ?? 0),
    finishedInstallmentsAmount: Number(row.finished_installments_amount ?? 0),
    projectedNextMonth: Number(row.projected_next_month ?? 0),
  };
}

async function getRecentPriceChanges(supabase: SupabaseClient, limit = 5): Promise<RecentPriceChange[]> {
  const { data, error } = await supabase
    .from('product_price_history')
    .select('id, product_id, old_price, new_price, changed_by, reason, created_at, product:products!inner(name, slug)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    product_id: string;
    old_price: number;
    new_price: number;
    changed_by: string | null;
    reason: string | null;
    created_at: string;
    product: { name: string; slug: string | null }[];
  }>;

  const userIds = [...new Set(rows.map((row) => row.changed_by).filter((value): value is string => Boolean(value)))];

  let names: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
    names = Object.fromEntries((profiles ?? []).map((profile) => [profile.user_id, profile.full_name]));
  }

  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product[0]?.name ?? 'Producto sin nombre',
    productSlug: row.product[0]?.slug ?? null,
    oldPrice: Number(row.old_price),
    newPrice: Number(row.new_price),
    changedByName: row.changed_by ? (names[row.changed_by] ?? null) : null,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

async function getCreditOverdueAggregate(supabase: SupabaseClient): Promise<CreditOverdueAggregate> {
  const today = new Date().toISOString().slice(0, 10);
  let total = 0;
  let count = 0;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('credit_installments')
      .select('remaining_amount')
      .gt('remaining_amount', 0)
      .lt('due_date', today)
      .range(offset, offset + 999);

    if (error) {
      throw error;
    }

    const rows = data ?? [];

    for (const row of rows) {
      total += Number(row.remaining_amount);
    }

    count += rows.length;

    if (rows.length < 1000) {
      break;
    }

    offset += 1000;
  }

  return { total, count };
}

function findDiagnostic(diagnostics: MaintenanceDiagnostic[], key: string): MaintenanceDiagnostic | undefined {
  return diagnostics.find((diagnostic) => diagnostic.key === key);
}

function buildAlerts(params: {
  diagnostics: MaintenanceDiagnostic[];
  lastBackup: string | null;
  ageDays: number | null;
  trashProducts: number;
  proveedorAlertas: ProveedorAlerta[];
  outOfStock: number;
}): SmartDashboardAlert[] {
  const alerts: SmartDashboardAlert[] = [];

  const withoutCategory = findDiagnostic(params.diagnostics, 'products_without_category');
  if (withoutCategory && withoutCategory.count > 0) {
    alerts.push({
      id: 'products-without-category',
      level: 'warning',
      title: 'Productos sin categoría',
      description: `${withoutCategory.count} producto(s) sin categoría asignada`,
      count: withoutCategory.count,
      href: '/admin/productos',
    });
  }

  const withoutImage = findDiagnostic(params.diagnostics, 'products_without_image');
  if (withoutImage && withoutImage.count > 0) {
    alerts.push({
      id: 'products-without-image',
      level: 'warning',
      title: 'Productos sin imagen',
      description: `${withoutImage.count} producto(s) sin imagen`,
      count: withoutImage.count,
      href: '/admin/productos',
    });
  }

  const creditInconsistent = findDiagnostic(params.diagnostics, 'credit_accounts_inconsistent');
  if (creditInconsistent && creditInconsistent.count > 0) {
    alerts.push({
      id: 'credit-accounts-inconsistent',
      level: 'error',
      title: 'Cuentas corrientes inconsistentes',
      description: creditInconsistent.detail ?? `${creditInconsistent.count} cuenta(s) con inconsistencias`,
      count: creditInconsistent.count,
      href: '/admin/cuenta-corriente',
    });
  }

  const sinFactura = params.proveedorAlertas.filter((alerta) => alerta.tipo === 'sin_factura_adjunto');
  if (sinFactura.length > 0) {
    alerts.push({
      id: 'proveedor-sin-factura',
      level: 'warning',
      title: 'Proveedores sin factura',
      description: `${sinFactura.length} compra(s) sin factura ni adjunto`,
      count: sinFactura.length,
      href: '/admin/provedores',
    });
  }

  const sinMovimiento = params.proveedorAlertas.filter((alerta) => alerta.tipo === 'sin_movimiento');
  if (sinMovimiento.length > 0) {
    alerts.push({
      id: 'proveedor-sin-movimiento',
      level: 'warning',
      title: 'Proveedores sin movimientos',
      description: `${sinMovimiento.length} proveedor(es) sin compras en los últimos 90 días`,
      count: sinMovimiento.length,
      href: '/admin/provedores',
    });
  }

  if (params.lastBackup === null || params.ageDays === null || params.ageDays > 7) {
    alerts.push({
      id: 'backup-desactualizado',
      level: 'error',
      title: 'Backup desactualizado',
      description: params.lastBackup === null ? 'No hay backups registrados' : 'El último backup tiene más de 7 días',
      href: '/admin/configuracion',
    });
  }

  if (params.trashProducts > 5) {
    alerts.push({
      id: 'papelera-llena',
      level: 'warning',
      title: 'Papelera con muchos productos',
      description: `${params.trashProducts} producto(s) en papelera`,
      count: params.trashProducts,
      href: '/admin/productos/papelera',
    });
  }

  if (params.outOfStock > 0) {
    alerts.push({
      id: 'productos-sin-stock',
      level: 'error',
      title: 'Productos sin stock',
      description: `${params.outOfStock} producto(s) sin stock`,
      count: params.outOfStock,
      href: '/admin/productos',
    });
  }

  return alerts;
}

export async function getSmartDashboard(): Promise<SmartDashboardResponse> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const [
    analytics,
    credit,
    commercial,
    proveedores,
    proveedorAlertas,
    backupHistory,
    maintenance,
    recentSales,
    recentAudit,
    creditOverdue,
    priceChanges,
  ] = await Promise.all([
    getAdminDashboardAnalytics(),
    getCachedCreditDashboard(),
    getCachedCommercialMetrics(),
    getCachedProveedorDashboard(),
    getCachedProveedorAlertas(),
    getCachedBackupHistory(),
    getCachedMaintenanceStatus(),
    listRecentAdminSales(5),
    queryAuditLogs({ page: 1, pageSize: 5 }),
    getCreditOverdueAggregate(supabase),
    getRecentPriceChanges(supabase),
  ]);

  const [trashProducts] = await Promise.all([
    countTrashedProducts(supabase),
  ]);

  const diagnostics = maintenance.diagnostics;
  const errors = diagnostics.filter((diagnostic) => diagnostic.status === 'error').length;
  const warnings = diagnostics.filter((diagnostic) => diagnostic.status === 'warning').length;
  const systemStatus: MaintenanceStatus = errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'ok';

  const lastBackup = backupHistory.stats.lastBackup;
  const ageDays = lastBackup
    ? Math.max(0, Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86_400_000))
    : null;

  const comprasPendientesAmount = proveedores.proveedores.reduce((sum, proveedor) => sum + proveedor.total_pendiente, 0);

  const alerts = buildAlerts({
    diagnostics,
    lastBackup,
    ageDays,
    trashProducts,
    proveedorAlertas,
    outOfStock: analytics?.productHealth?.outOfStock ?? 0,
  });

  const recentBackups = backupHistory.logs.filter((log) => log.action === 'backup_exported').slice(0, 5);
  const recentRestorations = backupHistory.logs
    .filter(
      (log) => log.action === 'backup_restored' || log.action === 'backup_restore_failed' || log.action === 'backup_restore_started',
    )
    .slice(0, 5);

  return {
    dayStatus: {
      creditOverdue,
      comprasPendientes: { count: proveedores.facturas_pendientes, amount: comprasPendientesAmount },
      trashProducts,
      lastBackup: { date: lastBackup, ageDays },
      system: { status: systemStatus, warnings, errors },
    },
    quickSummary: {
      monthSalesCount: analytics?.currentMonthSalesCount ?? 0,
      monthSoldAmount: analytics?.currentMonthSoldAmount ?? 0,
      monthCollectedAmount: analytics?.currentMonthCollectedAmount ?? 0,
      collectionPending: credit?.totalPending ?? 0,
      averageTicket: analytics?.averageTicket ?? 0,
      todaySalesCount: analytics?.todaySalesCount ?? 0,
      todaySoldAmount: analytics?.todaySoldAmount ?? 0,
      monthlyGrowthPercentage: analytics?.monthlyGrowthPercentage ?? 0,
    },
    alerts,
    activity: {
      recentSales,
      priceChanges,
      recentBackups,
      recentRestorations,
      recentAudit: recentAudit.logs,
    },
    detailed: {
      dashboard: analytics,
      commercial,
    },
  };
}
