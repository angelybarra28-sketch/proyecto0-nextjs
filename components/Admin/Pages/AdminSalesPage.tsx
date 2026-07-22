'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminSalesSummarySection } from '@/components/Admin/Sales/AdminSalesSummarySection';
import { AdminSalesTable } from '@/components/Admin/Sales/AdminSalesTable';
import { CreditAccountsTable } from '@/components/Admin/Credit/CreditAccountsTable';
import { useAdminAccess, useAdminSales } from '@/components/Admin/useAdminData';
import { useCreditAccounts } from '@/components/Admin/useCreditAccounts';
import { useAdminSalesTable } from '@/hooks/useAdminSalesTable';
import { fetchCommercialMetrics } from '@/lib/services/admin/client';
import type { CreditAccountSummary } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

export function AdminSalesPage() {
  const { isAdmin } = useAdminAccess();
  const router = useRouter();
  const table = useAdminSalesTable();
  const { sales, pagination, isLoadingSales, salesError } = useAdminSales(isAdmin, table.query);
  const { accounts, isLoading, error: creditError } = useCreditAccounts(isAdmin);

  const [commercial, setCommercial] = useState<{
    currentMonthlyCollection: number;
    monthlyReplacement: number;
    replacementCount: number;
    finishedCards: number;
    finishedInstallmentsAmount: number;
    projectedNextMonth: number;
    finishedAccountsList: CreditAccountSummary[];
  } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetchCommercialMetrics()
      .then((data) => {
        if (!cancelled) setCommercial(data);
      })
      .catch((err) => {
        if (!cancelled) console.error('Commercial metrics not available:', err);
      });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentMonthAccounts = accounts.filter(
    (acc) => acc.originMonth === currentMonth && acc.originYear === currentYear
  );

  const finishedAccounts = commercial?.finishedAccountsList ?? [];

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Ventas Administrativas</h1>
      <div className={styles.sections}>
        <AdminSalesSummarySection sales={sales} />

        <section className={styles.section}>
          <div className={styles.adminTableHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Ventas Realizadas</h2>
              <p className={styles.adminTableSummary}>{currentMonthAccounts.length} cuenta(s)</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link
                href="/admin/ventas/nueva"
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
              >
                + Cargar Venta Manual
              </Link>
            </div>
          </div>
          {creditError && <div className={styles.adminAlertError}>{creditError}</div>}
          {isLoading ? (
            <p className={styles.empty}>Cargando ventas...</p>
          ) : (
            <CreditAccountsTable
              accounts={currentMonthAccounts}
              onSelectAccount={(id) => router.push(`/admin/cuenta-corriente?selected=${id}`)}
            />
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.adminTableHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Ventas Finalizadas</h2>
              <p className={styles.adminTableSummary}>{finishedAccounts.length} cuenta(s)</p>
            </div>
          </div>
          {isLoading ? (
            <p className={styles.empty}>Cargando ventas...</p>
          ) : (
            <CreditAccountsTable
              accounts={finishedAccounts}
              onSelectAccount={(id) => router.push(`/admin/cuenta-corriente?selected=${id}`)}
            />
          )}
        </section>

        <AdminSalesTable sales={sales} table={table} pagination={pagination} isLoadingSales={isLoadingSales} salesError={salesError} />
      </div>
      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
