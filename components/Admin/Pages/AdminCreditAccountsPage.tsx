'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import { useCreditAccounts, useCreditAccountDetail } from '@/components/Admin/useCreditAccounts';
import { CreditDashboardSection } from '@/components/Admin/Credit/CreditDashboardSection';
import { CreditAccountsTable } from '@/components/Admin/Credit/CreditAccountsTable';
import { CreditAccountDetailView } from '@/components/Admin/Credit/CreditAccountDetailView';
import { exportCreditAccountsToExcel } from '@/components/Admin/Credit/creditExport';
import { fetchCleanSummary, cleanCreditPortfolio } from '@/lib/services/admin/client';
import styles from '@/styles/Admin.module.css';

export function AdminCreditAccountsPage() {
  const { isAdmin } = useAdminAccess();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'finished' | 'all'>('active');
  const { accounts, dashboard, isLoading, error, reload } = useCreditAccounts(isAdmin, search, statusFilter);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleanSummary, setCleanSummary] = useState<{
    allocationCount: number;
    paymentCount: number;
    installmentCount: number;
    accountCount: number;
    customerCount: number;
  } | null>(null);
  const [cleanResult, setCleanResult] = useState<{
    allocationsDeleted: number;
    paymentsDeleted: number;
    installmentsDeleted: number;
    accountsDeleted: number;
    customersDeleted: number;
    timestamp: string;
  } | null>(null);
  const [cleanConfirmText, setCleanConfirmText] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const [cleanError, setCleanError] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

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

  const openCleanModal = useCallback(async () => {
    setCleanResult(null);
    setCleanConfirmText('');
    setCleanError('');
    setShowCleanModal(true);
    setLoadingSummary(true);
    try {
      const summary = await fetchCleanSummary();
      setCleanSummary(summary);
    } catch (err) {
      console.error('Error loading clean summary:', err);
      setCleanError(
        'No se pudo cargar el resumen previo. Verifique que la función get_credit_clean_summary exista en la base de datos. '
        + 'Si no existe, aplique la migración SQL en Supabase.'
      );
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const closeCleanModal = useCallback(() => {
    setShowCleanModal(false);
    setCleanResult(null);
    setCleanConfirmText('');
    setCleanError('');
  }, []);

  const handleConfirmClean = useCallback(async () => {
    if (cleaning) return;
    if (cleanConfirmText !== 'ELIMINAR') return;
    setCleaning(true);
    setCleanError('');

    try {
      // Backup preventivo (único disparo)
      const now = new Date();
      const backupName = `BACKUP_CARTERA_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.xlsx`;
      try {
        exportCreditAccountsToExcel(accounts, backupName);
      } catch (backupErr) {
        console.error('Backup export failed:', backupErr);
        setCleanError('La exportación de backup falló. Limpieza cancelada.');
        return;
      }

      const result = await cleanCreditPortfolio();
      setCleanResult(result);
      await reload();
      closeCleanModal();
    } catch (err) {
      console.error('Error cleaning portfolio:', err);
      setCleanError(
        'No se pudo ejecutar la limpieza. Verifique que la función clean_credit_portfolio exista en la base de datos. '
        + 'Si no existe, aplique la migración SQL en Supabase.'
      );
    } finally {
      setCleaning(false);
    }
  }, [cleaning, cleanConfirmText, accounts, reload, closeCleanModal]);

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
                <button onClick={openCleanModal} className={styles.deleteBtn}>
                  Limpiar Cartera de Prueba
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

      {showCleanModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            maxWidth: 520,
            width: '100%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 22, color: '#991b1b' }}>⚠️ Limpiar Cartera de Prueba</h2>

            {cleanError && (
              <div className={styles.adminAlertError} style={{ marginBottom: 16 }}>{cleanError}</div>
            )}

            {!cleanResult ? (
              <>
                {loadingSummary ? (
                  <p className={styles.empty}>Cargando resumen...</p>
                ) : cleanSummary ? (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
                      Se eliminará la siguiente información de prueba:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
                      <div>Cuentas corrientes:</div>
                      <div style={{ fontWeight: 700 }}>{cleanSummary.accountCount}</div>
                      <div>Cuotas:</div>
                      <div style={{ fontWeight: 700 }}>{cleanSummary.installmentCount}</div>
                      <div>Pagos:</div>
                      <div style={{ fontWeight: 700 }}>{cleanSummary.paymentCount}</div>
                      <div>Clientes:</div>
                      <div style={{ fontWeight: 700 }}>{cleanSummary.customerCount}</div>
                    </div>
                    <p style={{ fontSize: 12, color: '#92400e', marginTop: 12, background: '#fef3c7', padding: 8, borderRadius: 6 }}>
                      <strong>Backup:</strong> Se generará automáticamente un archivo Excel antes de la limpieza.
                    </p>
                  </div>
                ) : null}

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 16 }}>
                  Para confirmar, escriba exactamente:
                  <input
                    type="text"
                    placeholder="ELIMINAR"
                    value={cleanConfirmText}
                    onChange={(e) => setCleanConfirmText(e.target.value)}
                    style={{ minHeight: 38, border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 14 }}
                    disabled={cleaning}
                  />
                </label>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button onClick={closeCleanModal} className={styles.adminActionButton} disabled={cleaning}>
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmClean}
                    className={styles.deleteBtn}
                    disabled={cleaning || cleanConfirmText !== 'ELIMINAR'}
                  >
                    {cleaning ? 'Limpiando...' : 'Confirmar Limpieza'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 14, color: '#065f46', marginBottom: 12, fontWeight: 700 }}>
                    Limpieza completada exitosamente.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
                    <div>Cuentas eliminadas:</div>
                    <div style={{ fontWeight: 700 }}>{cleanResult.accountsDeleted}</div>
                    <div>Cuotas eliminadas:</div>
                    <div style={{ fontWeight: 700 }}>{cleanResult.installmentsDeleted}</div>
                    <div>Pagos eliminados:</div>
                    <div style={{ fontWeight: 700 }}>{cleanResult.paymentsDeleted}</div>
                    <div>Clientes eliminados:</div>
                    <div style={{ fontWeight: 700 }}>{cleanResult.customersDeleted}</div>
                    <div>Fecha:</div>
                    <div style={{ fontWeight: 700 }}>{cleanResult.timestamp}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={closeCleanModal} className={styles.adminActionButton}>
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
