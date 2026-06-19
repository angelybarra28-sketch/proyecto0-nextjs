import { useState, useMemo } from 'react';
import type { CreditAccountSummary } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

const MONTH_NAMES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-AR');
}

type SortDirection = 'asc' | 'desc' | null;

function smartSortKey(value: string | null | undefined): [number, number, string] {
  if (!value) return [2, 0, ''];
  const str = String(value).trim();
  const numMatch = str.match(/^(\d+)/);
  if (numMatch) {
    return [0, Number(numMatch[1]), str.toLowerCase()];
  }
  return [1, 0, str.toLowerCase()];
}

type CreditAccountsTableProps = {
  accounts: CreditAccountSummary[];
  onSelectAccount?: (id: string) => void;
  onPayment?: (accountId: string, amount: number, paymentMethod: string, paymentDate: string) => Promise<void>;
  onFixInstallments?: (accountId: string) => Promise<void>;
};

export function CreditAccountsTable({ accounts, onSelectAccount, onPayment, onFixInstallments }: CreditAccountsTableProps) {
  const [tarjetaSort, setTarjetaSort] = useState<SortDirection>(null);
  const [paymentInputs, setPaymentInputs] = useState<Record<string, { amount: string; month: number; year: number }>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [fixingId, setFixingId] = useState<string | null>(null);

  const now = new Date();
  const defaultMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const yearOptions = [defaultYear - 1, defaultYear, defaultYear + 1];

  const sortedAccounts = useMemo(() => {
    if (!tarjetaSort) return accounts;
    return [...accounts].sort((a, b) => {
      const keyA = smartSortKey(a.operationNumber);
      const keyB = smartSortKey(b.operationNumber);
      let cmp = 0;
      if (keyA[0] !== keyB[0]) cmp = keyA[0] - keyB[0];
      else if (keyA[0] === 0 && keyB[0] === 0) cmp = keyA[1] - keyB[1];
      else cmp = keyA[2].localeCompare(keyB[2]);
      if (cmp === 0) cmp = keyA[2].localeCompare(keyB[2]);
      return tarjetaSort === 'desc' ? -cmp : cmp;
    });
  }, [accounts, tarjetaSort]);

  const handleSortClick = () => {
    setTarjetaSort((prev) => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
  };

  const sortIcon = tarjetaSort === 'asc' ? ' ↑' : tarjetaSort === 'desc' ? ' ↓' : ' ↕';

  const getPaymentState = (accountId: string) => {
    if (!paymentInputs[accountId]) {
      return { amount: '', month: defaultMonth, year: defaultYear };
    }
    return paymentInputs[accountId];
  };

  const updatePaymentState = (accountId: string, updates: Partial<{ amount: string; month: number; year: number }>) => {
    setPaymentInputs((prev) => ({
      ...prev,
      [accountId]: { ...getPaymentState(accountId), ...updates },
    }));
  };

  const handleSubmitPayment = async (accountId: string) => {
    const state = getPaymentState(accountId);
    const amount = Number(state.amount);
    if (!amount || amount <= 0 || !onPayment) return;

    const paymentDate = `${state.year}-${String(state.month + 1).padStart(2, '0')}-01`;
    setSubmittingId(accountId);
    try {
      await onPayment(accountId, amount, 'EFECTIVO', paymentDate);
      setPaymentInputs((prev) => {
        const next = { ...prev };
        delete next[accountId];
        return next;
      });
    } catch (err) {
      console.error('Error registering inline payment:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  if (accounts.length === 0) {
    return <p className={styles.empty}>No hay cuentas corrientes registradas</p>;
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 30,
    border: '1px solid #363330',
    background: '#1e1d1b',
    color: '#f5f2ec',
    borderRadius: 4,
    padding: '4px 6px',
    fontSize: 12,
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Cliente</th>
            <th className={styles.sortableTh} onClick={handleSortClick} title="Ordenar por Tarjeta (números primero, luego letras)">
              Tarjeta{sortIcon}
            </th>
            <th>Productos</th>
            <th>Fecha</th>
            <th>Mes</th>
            <th>Año</th>
            <th>Cuota</th>
            <th>Total</th>
            <th>Pagado</th>
            <th>Restante</th>
            <th>Pagos</th>
            <th>Estado</th>
            {onPayment && <th>Cobrar $</th>}
            {onPayment && <th>Mes de Cobro</th>}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedAccounts.map((acc) => {
            const payState = getPaymentState(acc.id);
            const isSubmitting = submittingId === acc.id;
            const canPay = acc.remaining > 0 && onPayment;

            return (
              <tr key={acc.id}>
                <td>{acc.customerName ?? '—'}</td>
                <td>{acc.operationNumber ?? '-'}</td>
                <td>{acc.productName}</td>
                <td>{formatDate(acc.saleDate)}</td>
                <td>{acc.originMonth ?? '-'}</td>
                <td>{acc.originYear ?? '-'}</td>
                <td>
                  {formatCurrency(acc.installmentAmount)} x {acc.installmentCount}
                </td>
                <td>{formatCurrency(acc.total)}</td>
                <td>{formatCurrency(acc.paid)}</td>
                <td>{formatCurrency(acc.remaining)}</td>
                <td>{acc.paymentCount}</td>
                <td>
                  <span
                    className={`${styles.status} ${
                      acc.remaining <= 0 ? styles.completed : acc.remaining < acc.total ? styles.pending : styles.overdue
                    }`}
                  >
                    {acc.remaining <= 0 ? 'Pagado' : acc.remaining < acc.total ? 'En curso' : 'Pendiente'}
                  </span>
                  {acc.installmentsMissing && (
                    <span title="Faltan cuotas en la base de datos. Hacé clic en Corregir para regenerar." style={{ marginLeft: 4, color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>!</span>
                  )}
                </td>
                {onPayment && (
                  <td style={{ minWidth: 90 }}>
                    {canPay ? (
                      <input
                        type="number"
                        step="0.01"
                        min={0.01}
                        max={acc.remaining}
                        placeholder="$0"
                        value={payState.amount}
                        onChange={(e) => updatePaymentState(acc.id, { amount: e.target.value })}
                        style={inputStyle}
                        disabled={isSubmitting}
                      />
                    ) : (
                      <span style={{ fontSize: 11, color: '#6b7280' }}>—</span>
                    )}
                  </td>
                )}
                {onPayment && (
                  <td style={{ minWidth: 180 }}>
                    {canPay ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <select
                          value={payState.month}
                          onChange={(e) => updatePaymentState(acc.id, { month: Number(e.target.value) })}
                          style={{ ...selectStyle, width: '45%' }}
                          disabled={isSubmitting}
                        >
                          {MONTH_NAMES.map((name, idx) => (
                            <option key={idx + 1} value={idx}>{name.slice(0, 3)}</option>
                          ))}
                        </select>
                        <select
                          value={payState.year}
                          onChange={(e) => updatePaymentState(acc.id, { year: Number(e.target.value) })}
                          style={{ ...selectStyle, width: '30%' }}
                          disabled={isSubmitting}
                        >
                          {yearOptions.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSubmitPayment(acc.id)}
                          disabled={isSubmitting || !payState.amount || Number(payState.amount) <= 0 || Number(payState.amount) > acc.remaining}
                          className={styles.adminActionButton}
                          style={{ padding: '4px 8px', fontSize: 11, minWidth: 0, whiteSpace: 'nowrap' }}
                          title="Cargar pago"
                        >
                          {isSubmitting ? '...' : '✓'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: '#6b7280' }}>—</span>
                    )}
                  </td>
                )}
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => onSelectAccount?.(acc.id)}
                      className={styles.adminActionButton}
                    >
                      Ver
                    </button>
                    {acc.installmentsMissing && onFixInstallments && (
                      <button
                        onClick={async () => {
                          if (fixingId) return;
                          setFixingId(acc.id);
                          try {
                            await onFixInstallments(acc.id);
                          } catch (err) {
                            console.error('Error fixing installments:', err);
                          } finally {
                            setFixingId(null);
                          }
                        }}
                        disabled={fixingId === acc.id}
                        className={styles.adminActionButton}
                        style={{ background: '#b45309', fontWeight: 700, fontSize: 11, padding: '4px 8px' }}
                        title="Regenerar cuotas faltantes y recalcular pagos"
                      >
                        {fixingId === acc.id ? '...' : 'Corregir'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}