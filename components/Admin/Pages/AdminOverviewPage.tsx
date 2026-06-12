'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminUsersSection } from '@/components/Admin/Customers/AdminUsersSection';
import { FinancialDashboardSection } from '@/components/Admin/Dashboard/FinancialDashboardSection';
import { CreditAccountsTable } from '@/components/Admin/Credit/CreditAccountsTable';
import { useAdminAccess, useAdminDashboard, useAdminUsers } from '@/components/Admin/useAdminData';
import { useCreditAccounts } from '@/components/Admin/useCreditAccounts';
import { fetchCommercialMetrics } from '@/lib/services/admin/client';
import type { CreditAccountSummary } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

export function AdminOverviewPage() {
  const { isAdmin, user } = useAdminAccess();
  const router = useRouter();
  const dashboard = useAdminDashboard(isAdmin);
  const { users, handleToggleUser } = useAdminUsers(isAdmin);
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
        if (!cancelled) {
          setCommercial(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Commercial metrics not available:', err);
        }
      });
    return () => {
      cancelled = true;
    };
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
      <h1 className={styles.title}>Panel de Administración</h1>
      <p className={styles.subtitle}>Bienvenido, {user?.nombreApellido}</p>

      <div className={styles.sections}>
        <FinancialDashboardSection
          dashboard={dashboard}
          commercial={commercial ? {
            currentMonthlyCollection: commercial.currentMonthlyCollection,
            monthlyReplacement: commercial.monthlyReplacement,
            replacementCount: commercial.replacementCount,
            finishedCards: commercial.finishedCards,
            finishedInstallmentsAmount: commercial.finishedInstallmentsAmount,
            projectedNextMonth: commercial.projectedNextMonth,
          } : null}
        />
        <AdminUsersSection users={users} onToggleUser={handleToggleUser} />
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
      </div>

      <div className={styles.actionButtonsRow}>
        <Link href="/admin/cuenta-corriente">
          <button className={styles.adminActionButton}>
            Cuenta Corriente
          </button>
        </Link>

        <Link href="/admin/importacion-cartera">
          <button className={styles.adminActionButton}>
            Importar Cartera Excel
          </button>
        </Link>

        <Link href="/admin/productos">
          <button className={styles.adminActionButton}>
            Productos
          </button>
        </Link>

        <Link href="/admin/ventas/nueva">
          <button className="rounded-lg border border-emerald-700 px-2.5 py-2 bg-emerald-600 text-white cursor-pointer text-[13px] font-semibold transition-all duration-200 ease-out shadow-md hover:bg-emerald-700 hover:-translate-y-0.5">
            + CARGAR VENTA MANUAL
          </button>
        </Link>

        <Link href="/">
          <button className={styles.adminActionButton}>
            Volver al inicio
          </button>
        </Link>
      </div>
    </div>
  );
}
