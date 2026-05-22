import type { FormEvent } from 'react';
import type { AdminSaleDetail, PaymentMethod } from '@/lib/supabase/types';
import { formatCurrency, getStatusClass } from '@/components/Admin/shared/formatters';
import styles from '@/styles/Admin.module.css';

type AdminSaleDetailViewProps = {
  sale: AdminSaleDetail | null;
  isLoading: boolean;
  error: string;
  paymentAmount: string;
  onPaymentAmountChange: (value: string) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  paymentDate: string;
  onPaymentDateChange: (value: string) => void;
  paymentNotes: string;
  onPaymentNotesChange: (value: string) => void;
  paymentError: string;
  isRegisteringPayment: boolean;
  onRegisterPayment: () => void;
};

export function AdminSaleDetailView({
  sale,
  isLoading,
  error,
  paymentAmount,
  onPaymentAmountChange,
  paymentMethod,
  onPaymentMethodChange,
  paymentDate,
  onPaymentDateChange,
  paymentNotes,
  onPaymentNotesChange,
  paymentError,
  isRegisteringPayment,
  onRegisterPayment,
}: AdminSaleDetailViewProps) {
  const handleRegisterPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRegisterPayment();
  };

  return (
    <div className={styles.sections}>
      {isLoading && <section className={styles.section}><p className={styles.empty}>Cargando venta...</p></section>}
      {error && <section className={styles.section}><p className={styles.empty}>{error}</p></section>}

      {sale && (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{sale.saleNumber}</h2>
            <table className={styles.table}>
              <tbody>
                <tr><td>Cliente</td><td>{sale.customer?.fullName ?? sale.deliveryFullName ?? 'Sin nombre'}</td></tr>
                <tr><td>Teléfono</td><td>{sale.customer?.phone ?? sale.deliveryPhone ?? '-'}</td></tr>
                <tr><td>Email</td><td>{sale.customer?.email ?? '-'}</td></tr>
                <tr><td>Dirección</td><td>{sale.deliveryAddress ?? sale.customer?.address ?? '-'}</td></tr>
                <tr><td>Localidad</td><td>{sale.deliveryCity ?? sale.customer?.city ?? '-'}</td></tr>
                <tr><td>Fecha</td><td>{new Date(sale.saleDate).toLocaleString('es-AR')}</td></tr>
                <tr>
                  <td>Estado de venta</td>
                  <td><span className={`${styles.status} ${styles[getStatusClass(sale.saleStatus)]}`}>{sale.saleStatus}</span></td>
                </tr>
                <tr>
                  <td>Estado de cobranza</td>
                  <td><span className={`${styles.status} ${styles[getStatusClass(sale.collectionStatus)]}`}>{sale.collectionStatus}</span></td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Productos ({sale.itemCount})</h2>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Subtotal</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.category ?? '-'}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.subtotal)}</td>
                      <td>{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Resumen Económico</h2>
            <table className={styles.table}>
              <tbody>
                <tr><td>Subtotal</td><td>{formatCurrency(sale.subtotal)}</td></tr>
                <tr><td>Descuento</td><td>{formatCurrency(sale.discountAmount)}</td></tr>
                <tr><td>Total</td><td>{formatCurrency(sale.total)}</td></tr>
                <tr><td>Pagado</td><td>{formatCurrency(sale.paidAmount)}</td></tr>
                <tr><td>Restante</td><td>{formatCurrency(sale.remainingAmount)}</td></tr>
                <tr><td>Plan de pago</td><td>{sale.paymentPlanType}</td></tr>
                <tr><td>Cantidad de cuotas</td><td>{sale.installmentsCount}</td></tr>
                <tr><td>Método solicitado</td><td>{sale.paymentMethodRequested ?? '-'}</td></tr>
                <tr><td>Creada</td><td>{new Date(sale.createdAt).toLocaleString('es-AR')}</td></tr>
                <tr><td>Actualizada</td><td>{new Date(sale.updatedAt).toLocaleString('es-AR')}</td></tr>
              </tbody>
            </table>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Cuotas ({sale.installments.length})</h2>
            {sale.installments.length === 0 ? (
              <p className={styles.empty}>Esta venta no tiene cuotas generadas</p>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Cuota</th>
                      <th>Vencimiento</th>
                      <th>Monto</th>
                      <th>Pagado</th>
                      <th>Restante</th>
                      <th>Atraso</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.installments.map((installment) => (
                      <tr key={installment.id}>
                        <td>{installment.installmentNumber}</td>
                        <td>{new Date(installment.dueDate).toLocaleDateString('es-AR')}</td>
                        <td>{formatCurrency(installment.originalAmount)}</td>
                        <td>{formatCurrency(installment.paidAmount)}</td>
                        <td>{formatCurrency(installment.remainingAmount)}</td>
                        <td>{installment.overdueDays > 0 ? `${installment.overdueDays} días` : '-'}</td>
                        <td>
                          <span className={`${styles.status} ${styles[getStatusClass(installment.status === 'OVERDUE' ? 'CANCELLED' : installment.status === 'PAID' ? 'PAID' : 'PENDING')]}`}>
                            {installment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Registrar Pago</h2>
            {sale.installments.length === 0 ? (
              <p className={styles.empty}>Esta venta no tiene cuotas para imputar pagos</p>
            ) : sale.remainingAmount <= 0 ? (
              <p className={styles.empty}>La venta ya está cancelada</p>
            ) : (
              <form onSubmit={handleRegisterPayment}>
                <table className={styles.table}>
                  <tbody>
                    <tr>
                      <td>Monto</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(event) => onPaymentAmountChange(event.target.value)}
                          required
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Método</td>
                      <td>
                        <select value={paymentMethod} onChange={(event) => onPaymentMethodChange(event.target.value as PaymentMethod)}>
                          <option value="CASH">Efectivo</option>
                          <option value="BANK_TRANSFER">Transferencia</option>
                          <option value="MERCADO_PAGO">Mercado Pago</option>
                          <option value="CREDIT_CARD">Tarjeta crédito</option>
                          <option value="DEBIT_CARD">Tarjeta débito</option>
                          <option value="OTHER">Otro</option>
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td>Fecha</td>
                      <td>
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(event) => onPaymentDateChange(event.target.value)}
                          required
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Observaciones</td>
                      <td>
                        <input
                          type="text"
                          value={paymentNotes}
                          onChange={(event) => onPaymentNotesChange(event.target.value)}
                          placeholder="Opcional"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
                {paymentError && <p className={styles.empty}>{paymentError}</p>}
                <button className={styles.deleteBtn} type="submit" disabled={isRegisteringPayment}>
                  {isRegisteringPayment ? 'Registrando...' : 'Registrar pago'}
                </button>
              </form>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Pagos ({sale.payments.length})</h2>
            {sale.payments.length === 0 ? (
              <p className={styles.empty}>No hay pagos registrados</p>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Monto</th>
                      <th>Método</th>
                      <th>Estado</th>
                      <th>Allocations</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{new Date(payment.paymentDate).toLocaleDateString('es-AR')}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{payment.paymentMethod}</td>
                        <td>{payment.status}</td>
                        <td>{payment.allocations.length}</td>
                        <td>{payment.notes ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
