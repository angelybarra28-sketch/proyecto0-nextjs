import styles from './Dashboard.module.css';

type SkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
}
