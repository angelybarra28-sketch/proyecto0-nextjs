import { useState, useMemo } from 'react';
import type { CreditAccountSummary } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

const MONTH_NAMES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
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
  onBatchSubmit?: (payments: { accountId: string; amount: number; paymentDate: string }[]) => Promise<{ accountId: string; success: boolean; error?: string }[]>;
  onFixInstallments?: (accountId: string) => Promise<void>;
};

export function CreditAccountsTable({ accounts, onSelectAccount, onPayment, onFixInstallments, onBatchSubmit }: CreditAccountsTableProps) {
  const [tarjetaSort, setTarjetaSort] = useState<SortDirection>(null);
  const [paymentInputs, setPaymentInputs] = useState<Record<string, { amount: string; month: number; year: number }>>({});
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

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

  const handleBatchSubmit = async () => {
    if (!onBatchSubmit) return;

    const pending = Object.entries(paymentInputs).filter(
      ([, v]) => Number(v.amount) > 0
    );
    if (pending.length === 0) return;

    const payments = pending.map(([accountId, v]) => ({
      accountId,
      amount: Number(v.amount),
      paymentDate: `${v.year}-${String(v.month + 1).padStart(2, '0')}-01`,
    }));

    setIsBatchSubmitting(true);
    try {
      const results = await onBatchSubmit(payments);
      setPaymentInputs((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.success) delete next[r.accountId];
        }
        return next;
      });
      const errors = results.filter((r) => !r.success);
      if (errors.length > 0) {
        console.error('Errores en pagos batch:', errors);
      }
    } catch (err) {
      console.error('Error en envío batch:', err);
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const pendingCount = useMemo(
    () => Object.values(paymentInputs).filter((v) => Number(v.amount) > 0).length,
    [paymentInputs]
  );

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
            <th className={styles.sortableTh} onClick={handleSortClick} title="Ordenar por Tarjeta">
              Tarjeta{sortIcon}
            </th>
            <th>Cuota</th>
            {onPayment && <th>Cobrar $</th>}
            {onPayment && <th>Pend.</th>}
            {onPayment && <th>Mes cobro</th>}
            {onPayment && <th>Año</th>}
            <th>Pagado</th>
            <th>Restante</th>
            <th>Total</th>
            <th>Cuotas pagas</th>
            <th>Ver</th>
          </tr>
        </thead>
        <tbody>
          {sortedAccounts.map((acc) => {
            const payState = getPaymentState(acc.id);
            const canPay = acc.remaining > 0 && onPayment;
            const paidInstallments = acc.installmentAmount > 0
              ? Math.floor(acc.paid / acc.installmentAmount)
              : 0;

            return (
              <tr key={acc.id}>
                <td>{acc.customerName ?? '—'}</td>
                <td>{acc.operationNumber ?? '-'}</td>
                <td>
                  {formatCurrency(acc.installmentAmount)} x {acc.installmentCount}
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
                        disabled={isBatchSubmitting}
                      />
                    ) : (
                      <span style={{ fontSize: 11, color: '#6b7280' }}>—</span>
                    )}
                  </td>
                )}
                {onPayment && (
                  <td style={{ textAlign: 'center' }}>
                    {canPay && Number(payState.amount) > 0 ? (
                      <span style={{ color: isBatchSubmitting ? '#555' : '#e68a2e', fontSize: 18, lineHeight: 1 }} title="Pago pendiente">
                        {isBatchSubmitting ? '◌' : '🟡'}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#6b7280' }}>—</span>
                    )}
                  </td>
                )}
                {onPayment && (
                  <td>
                    {canPay ? (
                      <select
                        value={payState.month}
                        onChange={(e) => updatePaymentState(acc.id, { month: Number(e.target.value) })}
                        style={selectStyle}
                        disabled={isBatchSubmitting}
                      >
                        {MONTH_NAMES.map((name, idx) => (
                          <option key={idx + 1} value={idx}>{name.slice(0, 3)}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: 11, color: '#6b7280' }}>—</span>
                    )}
                  </td>
                )}
                {onPayment && (
                  <td>
                    {canPay ? (
                      <select
                        value={payState.year}
                        onChange={(e) => updatePaymentState(acc.id, { year: Number(e.target.value) })}
                        style={selectStyle}
                        disabled={isBatchSubmitting}
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: 11, color: '#6b7280' }}>—</span>
                    )}
                  </td>
                )}
                <td>{formatCurrency(acc.paid)}</td>
                <td>{formatCurrency(acc.remaining)}</td>
                <td>{formatCurrency(acc.total)}</td>
                <td>{paidInstallments}/{acc.installmentCount}</td>
                <td>
                  <button
                    onClick={() => onSelectAccount?.(acc.id)}
                    className={styles.adminActionButton}
                  >
                    Ver
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {onBatchSubmit && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleBatchSubmit}
            disabled={pendingCount === 0 || isBatchSubmitting}
            className={styles.adminActionButton}
            style={{ padding: '10px 24px', fontSize: 16, fontWeight: 700 }}
          >
            {isBatchSubmitting ? 'Enviando...' : `Confirmar pagos (${pendingCount})`}
          </button>
        </div>
      )}
    </div>
  );
}