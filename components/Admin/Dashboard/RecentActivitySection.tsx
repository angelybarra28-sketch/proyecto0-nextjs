import { memo } from 'react';
import { formatCurrency, getStatusClass } from '@/components/Admin/shared/formatters';
import type { SmartDashboardActivity } from '@/lib/services/admin/smart-dashboard-client';
import type { AuditLogRow } from '@/lib/services/admin/auditService';
import styles from '@/styles/Admin.module.css';
import dashStyles from './Dashboard.module.css';
import { EmptyState } from './EmptyState';
import { SectionHeader } from './SectionHeader';
import { Skeleton } from './Skeleton';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function restoreLabel(log: AuditLogRow): { text: string; className: string } {
  if (log.action === 'backup_restored') return { text: '✔ Restaurado', className: styles.completed };
  if (log.action === 'backup_restore_failed') return { text: '✖ Falló', className: styles.cancelled };
  return { text: 'Iniciada', className: styles.pending };
}

function Block({
  title,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyHint,
  children,
}: {
  title: string;
  isEmpty: boolean;
  emptyIcon: string;
  emptyTitle: string;
  emptyHint: string;
  children: React.ReactNode;
}) {
  return (
    <div className={dashStyles.recentBlock}>
      <h3 className={dashStyles.recentBlockTitle}>{title}</h3>
      {isEmpty ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} />
      ) : (
        <div className={dashStyles.recentTableWrap}>
          <table className={styles.table}>{children}</table>
        </div>
      )}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className={dashStyles.recentGrid}>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className={dashStyles.skeletonBlock} />
      ))}
    </div>
  );
}

type RecentActivitySectionProps = {
  activity: SmartDashboardActivity | null;
  loading: boolean;
};

export const RecentActivitySection = memo(function RecentActivitySection({
  activity,
  loading,
}: RecentActivitySectionProps) {
  return (
    <section className={`${styles.section} ${dashStyles.sectionEnter}`}>
      <SectionHeader>Actividad reciente</SectionHeader>

      {loading || !activity ? (
        <ActivitySkeleton />
      ) : (
        <div className={dashStyles.recentGrid}>
          <Block
            title="Últimas ventas"
            isEmpty={activity.recentSales.length === 0}
            emptyIcon="🛒"
            emptyTitle="No hay ventas recientes"
            emptyHint="Las ventas aparecerán aquí apenas se registren."
          >
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {activity.recentSales.map((sale) => (
                <tr key={sale.id}>
                  <td className={`${dashStyles.cellNowrap} ${dashStyles.cellMuted}`}>
                    {formatDateTime(sale.saleDate)}
                  </td>
                  <td>{sale.customerName}</td>
                  <td className={`${dashStyles.cellNowrap} ${dashStyles.cellStrong}`}>
                    {formatCurrency(sale.total)}
                  </td>
                  <td>
                    <span className={`${styles.status} ${getStatusClass(sale.saleStatus)}`}>
                      {sale.saleStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Block>

          <Block
            title="Últimos cambios de precio"
            isEmpty={activity.priceChanges.length === 0}
            emptyIcon="🏷️"
            emptyTitle="No existen cambios de precios"
            emptyHint="Los cambios de precio recientes se mostrarán aquí."
          >
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio anterior</th>
                <th>Precio nuevo</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {activity.priceChanges.map((change) => (
                <tr key={change.id}>
                  <td>{change.productName}</td>
                  <td className={dashStyles.cellNowrap}>{formatCurrency(change.oldPrice)}</td>
                  <td className={`${dashStyles.cellNowrap} ${dashStyles.cellStrong}`}>
                    {formatCurrency(change.newPrice)}
                  </td>
                  <td className={`${dashStyles.cellNowrap} ${dashStyles.cellMuted}`}>
                    {formatDateTime(change.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Block>

          <Block
            title="Últimos backups"
            isEmpty={activity.recentBackups.length === 0}
            emptyIcon="💾"
            emptyTitle="No hay backups"
            emptyHint="Exporta un backup para comenzar a registrar el historial."
          >
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tamaño</th>
                <th>Filas</th>
              </tr>
            </thead>
            <tbody>
              {activity.recentBackups.map((log) => (
                <tr key={log.id}>
                  <td className={`${dashStyles.cellNowrap} ${dashStyles.cellMuted}`}>
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className={dashStyles.cellNowrap}>
                    {formatFileSize(typeof log.metadata.fileSizeBytes === 'number' ? log.metadata.fileSizeBytes : null)}
                  </td>
                  <td className={dashStyles.cellNowrap}>
                    {typeof log.metadata.totalRows === 'number' ? log.metadata.totalRows.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Block>

          <Block
            title="Últimas restauraciones"
            isEmpty={activity.recentRestorations.length === 0}
            emptyIcon="♻️"
            emptyTitle="No hay restauraciones"
            emptyHint="Las restauraciones realizadas aparecerán aquí."
          >
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Resultado</th>
                <th>Modo</th>
              </tr>
            </thead>
            <tbody>
              {activity.recentRestorations.map((log) => {
                const label = restoreLabel(log);
                return (
                  <tr key={log.id}>
                    <td className={`${dashStyles.cellNowrap} ${dashStyles.cellMuted}`}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td>
                      <span className={`${styles.status} ${label.className}`}>{label.text}</span>
                    </td>
                    <td>{typeof log.metadata.mode === 'string' ? log.metadata.mode : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </Block>

          <Block
            title="Últimas acciones del administrador"
            isEmpty={activity.recentAudit.length === 0}
            emptyIcon="🔍"
            emptyTitle="No hay acciones registradas"
            emptyHint="La actividad del administrador se registra automáticamente."
          >
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Entidad</th>
              </tr>
            </thead>
            <tbody>
              {activity.recentAudit.map((log) => (
                <tr key={log.id}>
                  <td className={`${dashStyles.cellNowrap} ${dashStyles.cellMuted}`}>
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className={`${dashStyles.cellMono} ${dashStyles.cellMuted}`}>{log.action}</td>
                  <td>{log.entity}</td>
                </tr>
              ))}
            </tbody>
          </Block>
        </div>
      )}
    </section>
  );
});
