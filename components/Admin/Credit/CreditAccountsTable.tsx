import type { CreditAccountSummary } from '@/lib/types';
import styles from '@/styles/Admin.module.css';

const MONTH_NAMES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-AR');
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
            <th>Cliente</th>
            <th>N° Tarjeta</th>
            <th>Artículo</th>
            <th>Fecha Venta</th>
            <th>Mes Origen</th>
            <th>Año Origen</th>
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
              <td>{acc.customerName ?? '—'}</td>
              <td>{acc.operationNumber ?? '-'}</td>
              <td>{acc.productName}</td>
              <td>{formatDate(acc.saleDate)}</td>
              <td>{acc.originMonth ? MONTH_NAMES[acc.originMonth - 1] : '-'}</td>
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
