'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import { useCreditAccounts, useCreditAccountDetail } from '@/components/Admin/useCreditAccounts';
import { CreditAccountsTable } from '@/components/Admin/Credit/CreditAccountsTable';
import { CreditAccountDetailView } from '@/components/Admin/Credit/CreditAccountDetailView';
import { fetchCleanSummary, cleanCreditPortfolio } from '@/lib/services/admin/client';
import styles from '@/styles/Admin.module.css';

export function AdminCreditAccountsPage() {
  const { isAdmin } = useAdminAccess();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'finished' | 'all'>('active');
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);
  const [filterYear, setFilterYear] = useState<number | undefined>(undefined);
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<'paid' | 'pending' | null>(null);
  const { accounts, dashboard, isLoading, error, reload, addPaymentInline, processBatchPayments, fixInstallments, page, setPage, totalCount, showAll, setShowAll, pageSize } = useCreditAccounts(isAdmin, search, statusFilter, filterMonth, filterYear, filterPaymentStatus);
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
        const { exportCreditAccountsToExcel: doExport } = await import('@/components/Admin/Credit/creditExport');
        doExport(accounts, backupName);
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
      <div className={styles.headerCompact}>
        <div>
          <h1 className={styles.title} style={{ margin: 0, textAlign: 'left' }}>
            Cuenta Corriente de Clientes
          </h1>
          <p className={styles.subtitle} style={{ margin: '2px 0 0 0', textAlign: 'left', fontSize: 14, color: '#d3cdc4' }}>
            Gestión de ventas a crédito y pagos
          </p>
        </div>
      </div>

      {error && <div className={styles.adminAlertError}>{error}</div>}
      {detailError && <div className={styles.adminAlertError}>{detailError}</div>}

      {selectedAccountId ? (
        <div className={styles.sections}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSelectedAccountId(null)}
              className={styles.compactBtn}
              style={{ fontSize: 14, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              Volver al listado
            </button>
          </div>
          {detailLoading && <p className={styles.empty}>Cargando detalle...</p>}
          {detail && (
            <CreditAccountDetailView account={detail} onPayment={handlePayment} onAddNote={handleAddNote} onFixInstallments={fixInstallments} />
          )}
        </div>
      ) : (
        <div className={styles.sections}>
          <section className={styles.section} id="cuentas-table">


            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, padding: '14px 16px', background: '#2a2826', borderRadius: 8, border: '1px solid #363330' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700, color: '#d3cdc4' }}>
                Buscar
                <input
                  type="text"
                  placeholder="N° tarjeta, cliente, artículo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ minHeight: 36, border: '1px solid #363330', background: '#1e1d1b', color: '#f5f2ec', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}
                />
              </label>

              <hr style={{ border: 'none', borderTop: '1px solid #3a3632', margin: '2px 0' }} />

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 250, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#8a7e72', fontWeight: 600 }}>Filtro por mes y pago:</span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10, fontWeight: 600, color: '#8a7e72' }}>
                      Mes
                      <select
                        value={filterMonth ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFilterMonth(val !== '' ? Number(val) : undefined);
                          if (val !== '' && filterYear === undefined) setFilterYear(now.getFullYear());
                        }}
                        style={{ minHeight: 30, border: '1px solid #363330', background: '#1e1d1b', color: '#f5f2ec', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}
                      >
                        <option value="">—</option>
                        {['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'].map((n, i) => (
                          <option key={i} value={i}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10, fontWeight: 600, color: '#8a7e72' }}>
                      Año
                      <select
                        value={filterYear ?? ''}
                        onChange={(e) => setFilterYear(e.target.value !== '' ? Number(e.target.value) : undefined)}
                        style={{ minHeight: 30, border: '1px solid #363330', background: '#1e1d1b', color: '#f5f2ec', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}
                      >
                        <option value="">—</option>
                        {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {filterMonth !== undefined && filterYear !== undefined && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 2 }}>
                      <span style={{ fontSize: 11, color: '#8a7e72', fontWeight: 600 }}>Pago del mes:</span>
                      {(['all' as const, 'pending' as const, 'paid' as const]).map((opt) => {
                        const label = opt === 'all' ? 'Todas' : opt === 'pending' ? 'Pendientes' : 'Pagadas';
                        const active = (opt === 'all' && filterPaymentStatus === null) || filterPaymentStatus === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => setFilterPaymentStatus(opt === 'all' ? null : opt)}
                            style={{
                              padding: '4px 10px',
                              border: '1px solid',
                              borderColor: active ? '#c8a87c' : '#5a5248',
                              borderRadius: 4,
                              background: active ? '#c8a87c' : 'transparent',
                              color: active ? '#1e1d1b' : '#d3cdc4',
                              cursor: 'pointer',
                              fontSize: 11,
                              fontWeight: active ? 700 : 400,
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 250, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#8a7e72', fontWeight: 600 }}>Estado general de la cuenta:</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {(['active' as const, 'finished' as const, 'all' as const]).map((opt) => {
                      const label = opt === 'active' ? 'Activas' : opt === 'finished' ? 'Finalizadas' : 'Todas';
                      const active = statusFilter === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setStatusFilter(opt)}
                          style={{
                            padding: '4px 10px',
                            border: '1px solid',
                            borderColor: active ? '#c8a87c' : '#5a5248',
                            borderRadius: 4,
                            background: active ? '#c8a87c' : 'transparent',
                            color: active ? '#1e1d1b' : '#d3cdc4',
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: active ? 700 : 400,
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                    {(search || filterMonth !== undefined || filterYear !== undefined || filterPaymentStatus !== null) && (
                      <button
                        onClick={() => { setSearch(''); setFilterMonth(undefined); setFilterYear(undefined); setFilterPaymentStatus(null); setStatusFilter('active'); }}
                        style={{ marginLeft: 12, padding: '4px 10px', border: '1px solid #d4543b', borderRadius: 4, background: 'transparent', color: '#d4543b', cursor: 'pointer', fontSize: 11 }}
                      >
                        Quitar todos los filtros
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #3a3632', margin: '2px 0' }} />

              <p style={{ fontSize: 12, color: '#8a7e72', margin: 0 }}>
                {totalCount > 0
                  ? showAll
                    ? `Mostrando las ${totalCount} cuenta(s)`
                    : `Mostrando ${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, totalCount)} de ${totalCount} cuenta(s)`
                  : `${accounts.length} cuenta(s)`}
              </p>
            </div>

            <CreditAccountsTable accounts={accounts} onSelectAccount={setSelectedAccountId} onPayment={addPaymentInline} onBatchSubmit={processBatchPayments} onFixInstallments={fixInstallments} />

            {totalCount > pageSize && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #363330',
                    borderRadius: 4,
                    background: page === 1 ? '#1e1d1b' : '#2a2826',
                    color: page === 1 ? '#555' : '#f5f2ec',
                    cursor: page === 1 ? 'default' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  ← Anterior
                </button>

                {(() => {
                  const totalPages = Math.ceil(totalCount / pageSize);
                  const pages: (number | '...')[] = [];
                  for (let p = 1; p <= totalPages; p++) {
                    if (totalPages <= 7) {
                      pages.push(p);
                    } else if (p === 1 || p === totalPages) {
                      if (pages[pages.length - 1] !== '...') pages.push('...');
                      pages.push(p);
                    } else if (Math.abs(p - page) <= 1) {
                      pages.push(p);
                    } else if (page <= 3 && p <= 5) {
                      pages.push(p);
                    } else if (page >= totalPages - 2 && p >= totalPages - 4) {
                      pages.push(p);
                    }
                  }
                  return pages.map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} style={{ color: '#555', fontSize: 12, padding: '0 4px' }}>...</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid',
                          borderColor: p === page ? '#c8a87c' : '#363330',
                          borderRadius: 4,
                          background: p === page ? '#c8a87c' : '#2a2826',
                          color: p === page ? '#1e1d1b' : '#f5f2ec',
                          fontWeight: p === page ? 700 : 400,
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        {p}
                      </button>
                    )
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(totalCount / pageSize)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #363330',
                    borderRadius: 4,
                    background: page >= Math.ceil(totalCount / pageSize) ? '#1e1d1b' : '#2a2826',
                    color: page >= Math.ceil(totalCount / pageSize) ? '#555' : '#f5f2ec',
                    cursor: page >= Math.ceil(totalCount / pageSize) ? 'default' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  Siguiente →
                </button>

                <button
                  type="button"
                  onClick={() => setShowAll(!showAll)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid',
                    borderColor: showAll ? '#c8a87c' : '#363330',
                    borderRadius: 4,
                    background: showAll ? '#c8a87c' : '#2a2826',
                    color: showAll ? '#1e1d1b' : '#f5f2ec',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 12,
                    marginLeft: 8,
                  }}
                >
                  {showAll ? '← Volver a paginación' : 'Mostrar todos'}
                </button>
              </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={async () => {
                    const { exportCreditAccountsToExcel: doExport } = await import('@/components/Admin/Credit/creditExport');
                    doExport(accounts);
                  }}
                  className={styles.compactBtn}
                  disabled={accounts.length === 0}
                >
                  Exportar Excel
                </button>
                <button onClick={() => reload()} className={styles.compactBtn} disabled={isLoading}>
                  {isLoading ? 'Cargando...' : 'Actualizar'}
                </button>
                <button onClick={openCleanModal} className={styles.deleteBtn}>
                  Limpiar Cartera de Prueba
                </button>
                <Link
                  href="/admin/importacion-cartera"
                  style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: '1px solid #4b6cb7', borderRadius: 4, background: '#3b5998', color: '#fff', cursor: 'pointer', textDecoration: 'none', transition: 'background 0.2s ease', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2d4373'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#3b5998'; }}
                >
                  + Importar nueva cartera desde Excel
                </Link>
                <Link
                  href="/admin/ventas/nueva"
                  style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: '1px solid #059669', borderRadius: 4, background: '#059669', color: '#fff', cursor: 'pointer', textDecoration: 'none', transition: 'background 0.2s ease', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#047857'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#059669'; }}
                >
                  + Cargar Venta Manual
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}

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
                  <button onClick={closeCleanModal} className={styles.compactBtn} disabled={cleaning}>
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
                  <button onClick={closeCleanModal} className={styles.compactBtn}>
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
