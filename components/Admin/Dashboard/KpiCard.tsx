import { memo } from 'react';
import styles from './Dashboard.module.css';

export type KpiTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info';

const ICON_TONE_CLASS: Record<KpiTone, string> = {
  neutral: styles.kpiIconNeutral,
  success: styles.kpiIconSuccess,
  danger: styles.kpiIconDanger,
  warning: styles.kpiIconWarning,
  info: styles.kpiIconInfo,
};

export type KpiCardProps = {
  icon: string;
  label: string;
  value: string;
  subvalue?: string;
  description?: string;
  tone?: KpiTone;
};

export const KpiCard = memo(function KpiCard({
  icon,
  label,
  value,
  subvalue,
  description,
  tone = 'neutral',
}: KpiCardProps) {
  return (
    <div className={styles.kpiCard} role="group" aria-label={`${label}: ${value}`}>
      <span className={`${styles.kpiIcon} ${ICON_TONE_CLASS[tone]}`} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.kpiBody}>
        <span className={styles.kpiLabel}>
          {label}
          {description && (
            <span
              className={styles.kpiTooltip}
              title={description}
              aria-label={description}
              role="img"
            >
              ⓘ
            </span>
          )}
        </span>
        <span className={styles.kpiValue}>{value}</span>
        {subvalue && <span className={styles.kpiSubvalue}>{subvalue}</span>}
      </div>
    </div>
  );
});
