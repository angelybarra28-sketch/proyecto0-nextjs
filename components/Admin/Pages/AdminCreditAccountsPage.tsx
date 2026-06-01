'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import { useCreditAccounts, useCreditAccountDetail } from '@/components/Admin/useCreditAccounts';
import { CreditDashboardSection } from '@/components/Admin/Credit/CreditDashboardSection';
import { CreditAccountsTable } from '@/components/Admin/Credit/CreditAccountsTable';
import { CreditAccountDetailView } from '@/components/Admin/Credit/CreditAccountDetailView';
import styles from '@/styles/Admin.module.css';

export function AdminCreditAccountsPage() {
  const { isAdmin } = useAdminAccess();
  const { accounts, dashboard, isLoading, error, reload } = useCreditAccounts(isAdmin);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const {
    account: detail,
    isLoading: detailLoading,
    error: detailError,
    addPayment,
    addNote,
  } = useCreditAccountDetail(selectedAccountId);

  const handlePayment = async (amount: number, notes: string) => {
    await addPayment(amount, notes);
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
                <p className={styles.adminTableSummary}>{accounts.length} cuenta(s) activa(s)</p>
              </div>
              <button onClick={() => reload()} className={styles.adminActionButton} disabled={isLoading}>
                {isLoading ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
            <CreditAccountsTable accounts={accounts} onSelectAccount={setSelectedAccountId} />
          </section>
        )}
      </div>

      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
