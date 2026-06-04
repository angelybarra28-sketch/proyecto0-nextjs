'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import { useCreditAccounts, useCreditAccountDetail } from '@/components/Admin/useCreditAccounts';
import { CreditDashboardSection } from '@/components/Admin/Credit/CreditDashboardSection';
import { CreditAccountsTable } from '@/components/Admin/Credit/CreditAccountsTable';
import { CreditAccountDetailView } from '@/components/Admin/Credit/CreditAccountDetailView';
import { exportCreditAccountsToExcel } from '@/components/Admin/Credit/creditExport';
import styles from '@/styles/Admin.module.css';

export function AdminCreditAccountsPage() {
  const { isAdmin } = useAdminAccess();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'finished' | 'all'>('active');
  const { accounts, dashboard, isLoading, error, reload } = useCreditAccounts(isAdmin, search, statusFilter);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const {
    account: detail,
    isLoading: detailLoading,
    error: detailError,
    addPayment,
    addNote,
  } = useCreditAccountDetail(selectedAccountId);

  const handlePayment = async (amount: number, paymentMethod: string, notes: string) => {
    await addPayment(amount, paymentMethod, notes);
    await reload();
  };

  const handleAddNote = async (input: Parameters<typeof addNote>[0]) => {
    await addNote(input);
    await reload();
  };

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Cuenta Corriente de Clientes</h1>
      <p className={styles.subtitle}>Gestión de ventas a crédito y pagos</p>

      <div className={styles.sections}>
        <CreditDashboardSection dashboard={dashboard} />

        {error && <div className={styles.adminAlertError}>{error}</div>}
        {detailError && <div className={styles.adminAlertError}>{detailError}</div>}

        {selectedAccountId ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setSelectedAccountId(null)} className={styles.adminActionButton}>
                ← Volver al listado
              </button>
            </div>
            {detailLoading && <p className={styles.empty}>Cargando detalle...</p>}
            {detail && (
              <CreditAccountDetailView account={detail} onPayment={handlePayment} onAddNote={handleAddNote} />
            )}
          </>
        ) : (
          <section className={styles.section}>
            <div className={styles.adminTableHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Cuentas Corrientes</h2>
                <p className={styles.adminTableSummary}>{accounts.length} cuenta(s)</p>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={() => exportCreditAccountsToExcel(accounts)}
                  className={styles.adminActionButton}
                  disabled={accounts.length === 0}
                >
                  Exportar Excel
                </button>
                <button onClick={() => reload()} className={styles.adminActionButton} disabled={isLoading}>
                  {isLoading ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700, color: '#555' }}>
                Buscar
                <input
                  type="text"
                  placeholder="N° tarjeta, cliente, artículo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ minHeight: 38, border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700, color: '#555' }}>
                Estado
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  style={{ minHeight: 38, border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px' }}
                >
                  <option value="active">Activas</option>
                  <option value="finished">Finalizadas</option>
                  <option value="all">Todas</option>
                </select>
              </label>
            </div>

            <CreditAccountsTable accounts={accounts} onSelectAccount={setSelectedAccountId} />

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Link href="/admin/importacion-cartera" style={{ fontSize: 14, color: '#667eea', textDecoration: 'none' }}>
                + Importar nueva cartera desde Excel
              </Link>
            </div>
          </section>
        )}
      </div>

      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
