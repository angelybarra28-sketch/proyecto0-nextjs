import styles from '@/styles/Admin.module.css';

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className={styles.sectionTitle} style={{ marginTop: 0, marginBottom: 14 }}>
      {children}
    </h2>
  );
}
