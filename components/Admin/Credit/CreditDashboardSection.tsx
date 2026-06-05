'use client';

import { useState, useEffect } from 'react';
import type { CreditDashboard } from '@/lib/types';
import styles from '@/styles/Admin.module.css';
import { CreditMonthlyChart } from './CreditMonthlyChart';
import { fetchCommercialMetrics, fetchControlMensual } from '@/lib/services/admin/client';
import { exportControlMensualToExcel } from './creditExport';

type CreditDashboardSectionProps = {
  dashboard: CreditDashboard | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

export function CreditDashboardSection({ dashboard }: CreditDashboardSectionProps) {
  const [commercial, setCommercial] = useState<{
    currentMonthlyCollection: number;
    monthlyReplacement: number;
    finishedCards: number;
    finishedInstallmentsAmount: number;
    projectedNextMonth: number;
  } | null>(null);
  const [commercialError, setCommercialError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCommercialMetrics()
      .then((data) => {
        if (!cancelled) setCommercial(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Commercial metrics not available:', err);
          setCommercialError(
            'Las métricas comerciales no están disponibles. Es probable que las funciones de base de datos aún no estén instaladas. '
            + 'Aplique la migración SQL en Supabase para habilitarlas.'
          );
        }
      });
    return () => { cancelled = true; };
  }, []);

  const handleExportControlMensual = async () => {
    setExporting(true);
    try {
      const data = await fetchControlMensual();
      exportControlMensualToExcel(data.rows, data.summary);
    } catch (err) {
      console.error('Error exporting control mensual:', err);
      alert('No se pudo exportar el control mensual');
    } finally {
      setExporting(false);
    }
  };

  if (!dashboard) return null;

  const variation = dashboard.previousMonthCollected > 0
    ? ((dashboard.currentMonthCollected - dashboard.previousMonthCollected) / dashboard.previousMonthCollected) * 100
    : 0;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Resumen de Cuenta Corriente</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, color: '#333' }}>
          <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Total Financiado</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 20 }}>{formatCurrency(dashboard.totalFinanced)}</p>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, color: '#333' }}>
          <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Total Cobrado</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 20 }}>{formatCurrency(dashboard.totalCollected)}</p>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, color: '#333' }}>
          <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Total Pendiente</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 20 }}>{formatCurrency(dashboard.totalPending)}</p>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, color: '#333' }}>
          <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Clientes con Deuda</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 20 }}>{dashboard.customersWithDebt} / {dashboard.customerCount}</p>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, color: '#333' }}>
          <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Ventas Activas</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 20 }}>{dashboard.activeAccounts}</p>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, color: '#333' }}>
          <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Ventas Finalizadas</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 20 }}>{dashboard.finishedAccounts}</p>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, color: '#333' }}>
          <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Cobrado Mes Actual</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 20 }}>{formatCurrency(dashboard.currentMonthCollected)}</p>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, color: '#333' }}>
          <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Variación vs Mes Ant.</p>
          <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 20, color: variation >= 0 ? '#065f46' : '#991b1b' }}>
            {variation.toFixed(1)}%
          </p>
        </div>
      </div>

      {dashboard.monthlyCollection.length > 0 && (
        <div>
          <h3 className={styles.sectionTitle} style={{ fontSize: 16, marginTop: 16 }}>Evolución Mensual de Cobranzas</h3>
          <CreditMonthlyChart data={dashboard.monthlyCollection} />
          <div className={styles.tableContainer} style={{ marginTop: 16 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Total Cobrado</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.monthlyCollection.map((m) => (
                  <tr key={m.month}>
                    <td>{m.month}</td>
                    <td>{formatCurrency(m.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, borderTop: '2px solid #eee', paddingTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Métricas Comerciales</h3>
          <button
            onClick={handleExportControlMensual}
            className={styles.adminActionButton}
            disabled={exporting}
          >
            {exporting ? 'Exportando...' : 'Exportar Control Mensual'}
          </button>
        </div>

        {commercialError && (
          <div style={{ background: '#fef3c7', color: '#92400e', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {commercialError}
          </div>
        )}

        {commercial && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16, color: '#333' }}>
              <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Reposición del Mes</p>
              <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 20, color: '#065f46' }}>{formatCurrency(commercial.monthlyReplacement)}</p>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: 10, padding: 16, color: '#333' }}>
              <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Tarjetas Terminadas del Mes</p>
              <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 20, color: '#991b1b' }}>{commercial.finishedCards}</p>
              <p style={{ fontSize: 12, color: '#991b1b', margin: '4px 0 0' }}>- {formatCurrency(commercial.finishedInstallmentsAmount)}</p>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, color: '#333' }}>
              <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Cobranza Actual</p>
              <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 20 }}>{formatCurrency(commercial.currentMonthlyCollection)}</p>
            </div>
            <div style={{ background: '#eff6ff', borderRadius: 10, padding: 16, color: '#333' }}>
              <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Proyección Próxima Cobranza</p>
              <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 20, color: '#1e40af' }}>{formatCurrency(commercial.projectedNextMonth)}</p>
            </div>
          </div>
        )}

        {commercial && (
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, color: '#333' }}>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Impacto Proyectado</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div>
                <span style={{ fontSize: 12, color: '#666' }}>Cobranza actual:</span>
                <span style={{ fontWeight: 700, marginLeft: 4 }}>{formatCurrency(commercial.currentMonthlyCollection)}</span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: '#065f46' }}>+ Reposición:</span>
                <span style={{ fontWeight: 700, marginLeft: 4, color: '#065f46' }}>{formatCurrency(commercial.monthlyReplacement)}</span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: '#991b1b' }}>- Terminadas:</span>
                <span style={{ fontWeight: 700, marginLeft: 4, color: '#991b1b' }}>{formatCurrency(commercial.finishedInstallmentsAmount)}</span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: '#333' }}>= Resultado:</span>
                <span style={{ fontWeight: 700, marginLeft: 4, color: '#1e40af' }}>{formatCurrency(commercial.projectedNextMonth)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
