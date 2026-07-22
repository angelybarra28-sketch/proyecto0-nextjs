'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import { ProveedoresTabs, type Tab } from '@/components/Admin/Proveedores/ProveedoresTabs';
import { ProveedoresDashboard } from '@/components/Admin/Proveedores/ProveedoresDashboard';
import { ProveedoresList } from '@/components/Admin/Proveedores/ProveedoresList';
import { ComprasList } from '@/components/Admin/Proveedores/ComprasList';
import { PagosList } from '@/components/Admin/Proveedores/PagosList';
import { DeudasSection } from '@/components/Admin/Proveedores/DeudasSection';
import { EstadisticasProveedores } from '@/components/Admin/Proveedores/EstadisticasProveedores';
import styles from '@/styles/Admin.module.css';

export function AdminProvedoresPage() {
  const { isAdmin } = useAdminAccess();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <div className={styles.headerCompact}>
        <div>
          <h1 className={styles.title} style={{ margin: 0, textAlign: 'left' }}>
            Proveedores
          </h1>
          <p className={styles.subtitle} style={{ margin: '2px 0 0 0', textAlign: 'left', fontSize: 14, color: '#d3cdc4' }}>
            Gestión de proveedores
          </p>
        </div>
      </div>

      <ProveedoresTabs active={activeTab} onChange={setActiveTab} />

      <div className={styles.sections}>
        {activeTab === 'dashboard' && <ProveedoresDashboard onNavigateTab={setActiveTab} />}
        {activeTab === 'proveedores' && <ProveedoresList />}
        {activeTab === 'compras' && <ComprasList />}
        {activeTab === 'pagos' && <PagosList />}
        {activeTab === 'deudas' && <DeudasSection />}
        {activeTab === 'estadisticas' && <EstadisticasProveedores />}
      </div>

      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
