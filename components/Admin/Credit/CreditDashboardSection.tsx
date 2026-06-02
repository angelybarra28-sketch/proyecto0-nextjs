import type { CreditDashboard } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

type CreditDashboardSectionProps = {
  dashboard: CreditDashboard | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

export function CreditDashboardSection({ dashboard }: CreditDashboardSectionProps) {
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
          <div className={styles.tableContainer}>
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
    </section>
  );
}
