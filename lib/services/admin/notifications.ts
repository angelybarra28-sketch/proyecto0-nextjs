import { unstable_cache } from 'next/cache';
import { getSmartDashboard } from '@/lib/services/admin/smart-dashboard';
import { queryAuditLogs } from '@/lib/services/admin/auditService';

const CACHE_TAG = 'admin-dashboard-analytics';
const CACHE_REVALIDATE = 60;

export type NotificationCategory =
  | 'backups'
  | 'credito'
  | 'productos'
  | 'proveedores'
  | 'sistema'
  | 'auditoria';

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type NotificationTone = 'error' | 'warning' | 'success' | 'info';

export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  tone: NotificationTone;
  icon: string;
  title: string;
  description: string;
  date: string;
  href: string;
  actionLabel: string;
};

export type NotificationSummary = {
  critical: number;
  warnings: number;
  info: number;
  resolved: number;
  total: number;
};

export type NotificationsResponse = {
  notifications: NotificationItem[];
  summary: NotificationSummary;
  generatedAt: string;
};

const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

async function loadNotificationsPayload(): Promise<NotificationsResponse> {
  const [dashboard, recentAudit] = await Promise.all([
    getSmartDashboard(),
    queryAuditLogs({ page: 1, pageSize: 20 }),
  ]);

  const notifications: NotificationItem[] = [];
  const now = new Date().toISOString();

  // ── Backups ─────────────────────────────────────────────
  const { date: lastBackup, ageDays } = dashboard.dayStatus.lastBackup;
  const failedRestore = dashboard.activity.recentRestorations.find(
    (log) => log.action === 'backup_restore_failed',
  );

  if (failedRestore) {
    notifications.push({
      id: 'backup-restore-failed',
      category: 'backups',
      priority: 'critical',
      tone: 'error',
      icon: '✖',
      title: 'El último restore falló',
      description: 'Una restauración de backup terminó en error. Revisá el historial de restauraciones.',
      date: failedRestore.created_at,
      href: '/admin/configuracion',
      actionLabel: 'Ir a Configuración',
    });
  }

  if (lastBackup === null || ageDays === null || ageDays > 7) {
    notifications.push({
      id: 'backup-antiguo',
      category: 'backups',
      priority: 'high',
      tone: 'warning',
      icon: '⚠',
      title: 'Backup antiguo',
      description:
        lastBackup === null
          ? 'No hay backups registrados. Hace más de 7 días que no se genera uno.'
          : `Hace ${ageDays} días que no se genera un backup.`,
      date: lastBackup ?? now,
      href: '/admin/configuracion',
      actionLabel: 'Crear Backup',
    });
  }

  if (!failedRestore && lastBackup && ageDays !== null && ageDays <= 7) {
    notifications.push({
      id: 'backup-exitoso',
      category: 'backups',
      priority: 'info',
      tone: 'success',
      icon: '✔',
      title: 'Backup exitoso',
      description: 'El último backup se generó correctamente y está al día.',
      date: lastBackup,
      href: '/admin/configuracion',
      actionLabel: 'Ver historial',
    });
  }

  // ── Crédito ─────────────────────────────────────────────
  const overdue = dashboard.dayStatus.creditOverdue;

  if (overdue.count > 0) {
    notifications.push(
      {
        id: 'credito-cuotas-vencidas',
        category: 'credito',
        priority: 'critical',
        tone: 'error',
        icon: '⚠',
        title: 'Clientes con cuotas vencidas',
        description: `${overdue.count} cuota(s) vencidas con saldo pendiente de cobro.`,
        date: now,
        href: '/admin/cuenta-corriente',
        actionLabel: 'Ir a Cuenta Corriente',
      },
      {
        id: 'credito-deuda-vencida',
        category: 'credito',
        priority: 'high',
        tone: 'warning',
        icon: '⚠',
        title: 'Deuda vencida',
        description: `Monto total vencido acumulado: ${formatMoney(overdue.total)}.`,
        date: now,
        href: '/admin/cuenta-corriente',
        actionLabel: 'Ir a Cuenta Corriente',
      },
    );
  } else {
    notifications.push({
      id: 'credito-normal',
      category: 'credito',
      priority: 'info',
      tone: 'success',
      icon: '✔',
      title: 'Cuenta corriente normal',
      description: 'No hay cuotas vencidas ni deuda pendiente de cobro.',
      date: now,
      href: '/admin/cuenta-corriente',
      actionLabel: 'Ver Cuenta Corriente',
    });
  }

  // ── Productos ───────────────────────────────────────────
  const dashboardAlerts = dashboard.alerts;
  const productHealth = dashboard.detailed.dashboard?.productHealth;
  const withoutCategory = dashboardAlerts.find((alert) => alert.id === 'products-without-category');
  const withoutImage = dashboardAlerts.find((alert) => alert.id === 'products-without-image');

  const productIssues: NotificationItem[] = [];

  if (withoutCategory && (withoutCategory.count ?? 0) > 0) {
    productIssues.push({
      id: 'productos-sin-categoria',
      category: 'productos',
      priority: 'medium',
      tone: 'warning',
      icon: '⚠',
      title: 'Productos sin categoría',
      description: `${withoutCategory.count} producto(s) sin categoría asignada.`,
      date: now,
      href: '/admin/productos',
      actionLabel: 'Ir a Productos',
    });
  }

  if (withoutImage && (withoutImage.count ?? 0) > 0) {
    productIssues.push({
      id: 'productos-sin-imagen',
      category: 'productos',
      priority: 'medium',
      tone: 'warning',
      icon: '⚠',
      title: 'Productos sin imagen',
      description: `${withoutImage.count} producto(s) sin imagen cargada.`,
      date: now,
      href: '/admin/productos',
      actionLabel: 'Ir a Productos',
    });
  }

  if ((productHealth?.lowStock ?? 0) > 0) {
    productIssues.push({
      id: 'productos-bajo-stock',
      category: 'productos',
      priority: 'medium',
      tone: 'warning',
      icon: '⚠',
      title: 'Productos con bajo stock',
      description: `${productHealth?.lowStock ?? 0} producto(s) con stock bajo.`,
      date: now,
      href: '/admin/productos',
      actionLabel: 'Ir a Productos',
    });
  }

  if (dashboard.dayStatus.trashProducts > 0) {
    productIssues.push({
      id: 'productos-en-papelera',
      category: 'productos',
      priority: 'low',
      tone: 'warning',
      icon: '⚠',
      title: 'Productos en papelera',
      description: `${dashboard.dayStatus.trashProducts} producto(s) en la papelera pendientes de revisión.`,
      date: now,
      href: '/admin/productos/papelera',
      actionLabel: 'Ver papelera',
    });
  }

  if (productIssues.length === 0) {
    productIssues.push({
      id: 'productos-en-orden',
      category: 'productos',
      priority: 'info',
      tone: 'success',
      icon: '✔',
      title: 'Catálogo en orden',
      description: 'Sin productos sin categoría, sin imagen, con bajo stock o en papelera.',
      date: now,
      href: '/admin/productos',
      actionLabel: 'Ir a Productos',
    });
  }

  notifications.push(...productIssues);

  // ── Proveedores ─────────────────────────────────────────
  const comprasPendientes = dashboard.dayStatus.comprasPendientes;
  const sinFactura = dashboardAlerts.find((alert) => alert.id === 'proveedor-sin-factura');
  const sinMovimiento = dashboardAlerts.find((alert) => alert.id === 'proveedor-sin-movimiento');

  const proveedorIssues: NotificationItem[] = [];

  if (comprasPendientes.count > 0) {
    proveedorIssues.push({
      id: 'proveedores-compras-pendientes',
      category: 'proveedores',
      priority: 'medium',
      tone: 'warning',
      icon: '⚠',
      title: 'Compras pendientes',
      description: `${comprasPendientes.count} factura(s) de compra sin pagar por ${formatMoney(comprasPendientes.amount)}.`,
      date: now,
      href: '/admin/provedores',
      actionLabel: 'Ir a Proveedores',
    });
  }

  if (sinFactura && sinFactura.count && sinFactura.count > 0) {
    proveedorIssues.push({
      id: 'proveedores-sin-factura',
      category: 'proveedores',
      priority: 'medium',
      tone: 'warning',
      icon: '⚠',
      title: 'Facturas sin adjunto',
      description: `${sinFactura.count} compra(s) sin factura ni adjunto cargado.`,
      date: now,
      href: '/admin/provedores',
      actionLabel: 'Ir a Compras',
    });
  }

  if (sinMovimiento && sinMovimiento.count && sinMovimiento.count > 0) {
    proveedorIssues.push({
      id: 'proveedores-sin-movimiento',
      category: 'proveedores',
      priority: 'low',
      tone: 'warning',
      icon: '⚠',
      title: 'Proveedores sin movimientos',
      description: `${sinMovimiento.count} proveedor(es) sin compras en los últimos 90 días.`,
      date: now,
      href: '/admin/provedores',
      actionLabel: 'Ir a Proveedores',
    });
  }

  if (proveedorIssues.length === 0) {
    proveedorIssues.push({
      id: 'proveedores-al-dia',
      category: 'proveedores',
      priority: 'info',
      tone: 'success',
      icon: '✔',
      title: 'Proveedores al día',
      description: 'Sin compras pendientes, facturas sin adjunto ni proveedores inactivos.',
      date: now,
      href: '/admin/provedores',
      actionLabel: 'Ir a Proveedores',
    });
  }

  notifications.push(...proveedorIssues);

  // ── Sistema ─────────────────────────────────────────────
  const system = dashboard.dayStatus.system;

  if (system.status === 'error') {
    notifications.push({
      id: 'sistema-error',
      category: 'sistema',
      priority: 'critical',
      tone: 'error',
      icon: '✖',
      title: 'Error detectado',
      description: `El diagnóstico detectó ${system.errors} error(es) en el sistema.`,
      date: now,
      href: '/admin/mantenimiento',
      actionLabel: 'Ir a Mantenimiento',
    });
  } else if (system.status === 'warning') {
    notifications.push({
      id: 'sistema-advertencias',
      category: 'sistema',
      priority: 'high',
      tone: 'warning',
      icon: '⚠',
      title: 'Diagnóstico con advertencias',
      description: `El diagnóstico registró ${system.warnings} advertencia(s).`,
      date: now,
      href: '/admin/mantenimiento',
      actionLabel: 'Ir a Mantenimiento',
    });
  } else {
    notifications.push({
      id: 'sistema-ok',
      category: 'sistema',
      priority: 'info',
      tone: 'success',
      icon: '✔',
      title: 'Todo correcto',
      description: 'El diagnóstico de mantenimiento no detectó problemas.',
      date: now,
      href: '/admin/mantenimiento',
      actionLabel: 'Ir a Mantenimiento',
    });
  }

  // ── Auditoría ───────────────────────────────────────────
  const lastAction = dashboard.activity.recentAudit[0];

  if (lastAction) {
    notifications.push({
      id: 'auditoria-ultima-accion',
      category: 'auditoria',
      priority: 'info',
      tone: 'info',
      icon: '✔',
      title: 'Última acción registrada',
      description: `${lastAction.action} sobre ${lastAction.entity}.`,
      date: lastAction.created_at,
      href: '/admin/auditoria',
      actionLabel: 'Ir a Auditoría',
    });
  }

  const failureCount = recentAudit.logs.filter((log) => /fail|error/i.test(log.action)).length;

  if (failureCount >= 3) {
    notifications.push({
      id: 'auditoria-errores-consecutivos',
      category: 'auditoria',
      priority: 'high',
      tone: 'warning',
      icon: '⚠',
      title: 'Errores repetidos',
      description: `${failureCount} acción(es) fallidas o con error en los últimos registros de auditoría.`,
      date: recentAudit.logs[0]?.created_at ?? now,
      href: '/admin/auditoria',
      actionLabel: 'Ir a Auditoría',
    });
  }

  notifications.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const summary: NotificationSummary = {
    critical: notifications.filter((notification) => notification.tone === 'error').length,
    warnings: notifications.filter((notification) => notification.tone === 'warning').length,
    info: notifications.filter((notification) => notification.tone === 'info').length,
    resolved: notifications.filter((notification) => notification.tone === 'success').length,
    total: notifications.length,
  };

  return {
    notifications,
    summary,
    generatedAt: now,
  };
}

const getCachedNotificationsPayload = unstable_cache(
  async () => loadNotificationsPayload(),
  [CACHE_TAG, 'smart-notifications'],
  { revalidate: CACHE_REVALIDATE },
);

export async function getNotifications(): Promise<NotificationsResponse> {
  return getCachedNotificationsPayload();
}
