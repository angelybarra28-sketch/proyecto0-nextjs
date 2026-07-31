import styles from './Dashboard.module.css';

export function EmptyState({
  icon = '🗂️',
  title,
  hint,
}: {
  icon?: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className={styles.emptyState} role="status">
      <span className={styles.emptyStateIcon} aria-hidden="true">
        {icon}
      </span>
      <p className={styles.emptyStateTitle}>{title}</p>
      {hint && <p className={styles.emptyStateHint}>{hint}</p>}
    </div>
  );
}
