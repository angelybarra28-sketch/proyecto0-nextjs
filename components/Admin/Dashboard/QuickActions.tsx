import { memo } from 'react';
import Link from 'next/link';
import styles from '@/styles/Admin.module.css';
import dashStyles from './Dashboard.module.css';
import { SectionHeader } from './SectionHeader';

const ACTIONS = [
  { href: '/admin/ventas/nueva', label: 'Nueva venta', icon: '➕', primary: true },
  { href: '/admin/clientes', label: 'Nuevo cliente', icon: '👤', primary: false },
  { href: '/admin/productos', label: 'Nuevo producto', icon: '🏷️', primary: false },
  { href: '/admin/provedores', label: 'Nueva compra', icon: '📦', primary: false },
  { href: '/admin/cuenta-corriente', label: 'Cuenta corriente', icon: '💳', primary: false },
  { href: '/admin/mantenimiento', label: 'Mantenimiento', icon: '🛠️', primary: false },
  { href: '/admin/backups', label: 'Backups', icon: '💾', primary: false },
  { href: '/admin/auditoria', label: 'Auditoría', icon: '🔍', primary: false },
];

export const QuickActions = memo(function QuickActions() {
  return (
    <section className={`${styles.section} ${dashStyles.sectionEnter}`}>
      <SectionHeader>Acciones rápidas</SectionHeader>
      <nav className={dashStyles.quickActions} aria-label="Acciones rápidas">
        {ACTIONS.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className={`${dashStyles.quickAction} ${action.primary ? dashStyles.quickActionPrimary : ''}`}
            aria-label={action.label}
          >
            <span className={dashStyles.quickActionIcon} aria-hidden="true">
              {action.icon}
            </span>
            {action.label}
          </Link>
        ))}
      </nav>
    </section>
  );
});
