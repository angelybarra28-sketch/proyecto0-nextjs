import type { CreditAccountSummary } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

type CreditAccountsTableProps = {
  accounts: CreditAccountSummary[];
  onSelectAccount?: (id: string) => void;
};

export function CreditAccountsTable({ accounts, onSelectAccount }: CreditAccountsTableProps) {
  if (accounts.length === 0) {
    return <p className={styles.empty}>No hay cuentas corrientes registradas</p>;
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>N° Tarjeta</th>
            <th>Artículo</th>
            <th>Cuota</th>
            <th>Total</th>
            <th>Pagado</th>
            <th>Restante</th>
            <th>Pagos</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((acc) => (
            <tr key={acc.id}>
              <td>{acc.operationNumber ?? '-'}</td>
              <td>{acc.productName}</td>
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
              </td>
              <td>
                <button
                  onClick={() => onSelectAccount?.(acc.id)}
                  className={styles.adminActionButton}
                >
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
