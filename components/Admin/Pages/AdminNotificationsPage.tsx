'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import { fetchNotifications, markNotificationsViewed } from '@/lib/services/admin/notifications-client';
import type {
  NotificationCategory,
  NotificationItem,
  NotificationPriority,
  NotificationTone,
  NotificationsResponse,
} from '@/lib/services/admin/notifications-client';
import { Skeleton } from '@/components/Admin/Dashboard/Skeleton';
import { EmptyState } from '@/components/Admin/Dashboard/EmptyState';
import styles from '@/styles/Admin.module.css';
import nStyles from '@/components/Admin/Notifications/Notifications.module.css';

const REFRESH_INTERVAL_MS = 60_000;

const CATEGORY_FILTERS: { value: NotificationCategory | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todos' },
  { value: 'credito', label: 'Crédito' },
  { value: 'productos', label: 'Productos' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'backups', label: 'Backups' },
  { value: 'proveedores', label: 'Proveedores' },
  { value: 'auditoria', label: 'Auditoría' },
];

const SEVERITY_FILTERS: { value: 'todas' | 'critical' | 'warnings' | 'info'; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'critical', label: 'Solo críticas' },
  { value: 'warnings', label: 'Solo advertencias' },
  { value: 'info', label: 'Solo información' },
];

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  backups: 'Backups',
  credito: 'Crédito',
  productos: 'Productos',
  proveedores: 'Proveedores',
  sistema: 'Sistema',
  auditoria: 'Auditoría',
};

const PRIORITY_LABEL: Record<NotificationPriority, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
  info: 'Info',
};

const TONE_ITEM_CLASS: Record<NotificationTone, string> = {
  error: nStyles.notificationItemError,
  warning: nStyles.notificationItemWarning,
  success: nStyles.notificationItemSuccess,
  info: nStyles.notificationItemInfo,
};

const TONE_ICON_CLASS: Record<NotificationTone, string> = {
  error: nStyles.iconError,
  warning: nStyles.iconWarning,
  success: nStyles.iconSuccess,
  info: nStyles.iconInfo,
};

const PRIORITY_CLASS: Record<NotificationPriority, string> = {
  critical: nStyles.priorityCritical,
  high: nStyles.priorityHigh,
  medium: nStyles.priorityMedium,
  low: nStyles.priorityLow,
  info: nStyles.priorityInfo,
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SummaryCard({
  tone,
  label,
  value,
}: {
  tone: 'danger' | 'warning' | 'info' | 'success';
  label: string;
  value: number;
}) {
  const toneClass = {
    danger: nStyles.summaryValueDanger,
    warning: nStyles.summaryValueWarning,
    info: nStyles.summaryValueInfo,
    success: nStyles.summaryValueSuccess,
  }[tone];

  return (
    <div className={nStyles.summaryCard}>
      <span className={`${nStyles.summaryValue} ${toneClass}`}>{value}</span>
      <span className={nStyles.summaryLabel}>{label}</span>
    </div>
  );
}

function NotificationRow({ notification }: { notification: NotificationItem }) {
  return (
    <div className={`${nStyles.notificationItem} ${TONE_ITEM_CLASS[notification.tone]}`}>
      <span
        className={`${nStyles.notificationIcon} ${TONE_ICON_CLASS[notification.tone]}`}
        aria-hidden="true"
      >
        {notification.icon}
      </span>
      <div className={nStyles.notificationBody}>
        <div className={nStyles.notificationTitle}>{notification.title}</div>
        <div className={nStyles.notificationDescription}>{notification.description}</div>
        <div className={nStyles.notificationMeta}>
          <span className={nStyles.notificationDate}>{formatDateTime(notification.date)}</span>
          <span className={nStyles.categoryBadge}>{CATEGORY_LABEL[notification.category]}</span>
          <span className={`${nStyles.priorityBadge} ${PRIORITY_CLASS[notification.priority]}`}>
            {PRIORITY_LABEL[notification.priority]}
          </span>
        </div>
      </div>
      <Link
        href={notification.href}
        className={nStyles.notificationAction}
        aria-label={`${notification.actionLabel} — ${notification.title}`}
      >
        {notification.actionLabel}
      </Link>
    </div>
  );
}

export function AdminNotificationsPage() {
  const { isAdmin } = useAdminAccess();
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'todas'>('todas');
  const [severityFilter, setSeverityFilter] = useState<'todas' | 'critical' | 'warnings' | 'info'>('todas');
  const viewedLogged = useRef(false);

  const loadNotifications = useCallback(async (signal?: AbortSignal) => {
    const payload = await fetchNotifications(signal);
    setData(payload);
    setError(null);
    return payload;
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    if (!viewedLogged.current) {
      viewedLogged.current = true;
      markNotificationsViewed();
    }

    const controller = new AbortController();

    loadNotifications(controller.signal)
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error al cargar las notificaciones');
      })
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      loadNotifications().catch(() => {
        // El refresco automático nunca interrumpe la vista actual.
      });
    }, REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [isAdmin, loadNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar las notificaciones');
    } finally {
      setRefreshing(false);
    }
  }, [loadNotifications]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.notifications.filter((notification) => {
      if (categoryFilter !== 'todas' && notification.category !== categoryFilter) return false;
      if (severityFilter === 'critical' && notification.tone !== 'error') return false;
      if (severityFilter === 'warnings' && notification.tone !== 'warning') return false;
      if (severityFilter === 'info' && notification.tone !== 'info') return false;
      return true;
    });
  }, [data, categoryFilter, severityFilter]);

  if (!isAdmin) return null;

  const hasErrorState = error && !data;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Centro de Notificaciones</h1>

      <div className={styles.sections}>
        <section className={`${styles.section} ${nStyles.sectionEnter}`}>
          <div className={nStyles.headerRow}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              Resumen
            </h2>
            <button className={styles.compactBtn} onClick={handleRefresh} disabled={refreshing || loading}>
              {refreshing ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
          <p className={nStyles.headerHint}>
            Se actualiza automáticamente cada 60 segundos
            {data && ` · Última actualización: ${formatDateTime(data.generatedAt)}`}
          </p>

          {hasErrorState ? (
            <EmptyState icon="⚠️" title="No se pudieron cargar las notificaciones" hint={error ?? undefined} />
          ) : (
            <div className={nStyles.summaryGrid}>
              <SummaryCard tone="danger" label="Críticas" value={data?.summary.critical ?? 0} />
              <SummaryCard tone="warning" label="Advertencias" value={data?.summary.warnings ?? 0} />
              <SummaryCard tone="info" label="Información" value={data?.summary.info ?? 0} />
              <SummaryCard tone="success" label="Resueltas" value={data?.summary.resolved ?? 0} />
            </div>
          )}
        </section>

        <section className={`${styles.section} ${nStyles.sectionEnter}`}>
          <h2 className={styles.sectionTitle} style={{ marginTop: 0, marginBottom: 12 }}>
            Filtros
          </h2>
          <div className={nStyles.filterBar}>
            <div className={nStyles.filterGroup}>
              <span className={nStyles.filterGroupLabel}>Categoría</span>
              {CATEGORY_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  className={`${styles.compactBtn} ${categoryFilter === filter.value ? nStyles.filterActive : ''}`}
                  onClick={() => setCategoryFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className={nStyles.filterGroup}>
              <span className={nStyles.filterGroupLabel}>Prioridad</span>
              {SEVERITY_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  className={`${styles.compactBtn} ${severityFilter === filter.value ? nStyles.filterActive : ''}`}
                  onClick={() => setSeverityFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${nStyles.sectionEnter}`}>
          <h2 className={styles.sectionTitle} style={{ marginTop: 0, marginBottom: 12 }}>
            Notificaciones
            {data && <span style={{ color: '#8a7e72', fontWeight: 600 }}> ({filtered.length})</span>}
          </h2>

          {loading && !data ? (
            <div className={nStyles.notificationList}>
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className={nStyles.skeletonAlert} />
              ))}
            </div>
          ) : hasErrorState ? (
            <EmptyState icon="🚨" title="No se pudieron cargar las notificaciones" hint="Revisá tu conexión e intentá actualizar." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="🔕"
              title="No hay notificaciones para los filtros seleccionados"
              hint="Probá con otros filtros o revisá la vista general."
            />
          ) : (
            <div className={nStyles.notificationList}>
              {filtered.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
