import { useState } from 'react';
import type { CreditAccountDetail } from '@/lib/types';
import styles from '@/styles/Admin.module.css';
import { CreditPaymentForm } from './CreditPaymentForm';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-AR');
}

// Formato seguro DD/MM/YYYY sin depender de locale implícito
function formatDateStrict(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function statusBadge(status: string) {
  switch (status) {
    case 'PAID':
      return <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#d1fae5', color: '#065f46' }}>Pagada</span>;
    case 'PARTIAL':
      return <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#fef3c7', color: '#92400e' }}>Parcial</span>;
    case 'OVERDUE':
      return <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#fee2e2', color: '#991b1b' }}>Vencida</span>;
    default:
      return <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#f3f4f6', color: '#374151' }}>Pendiente</span>;
  }
}

const MONTH_NAMES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

function formatOriginMonth(month?: number | null): string {
  return month && month >= 1 && month <= 12 ? MONTH_NAMES[month - 1] : '-';
}

function getAccountStatusLabel(account: CreditAccountDetail): { label: string; color: string; bg: string } {
  if (account.remaining <= 0) {
    return { label: 'Finalizada', color: '#065f46', bg: '#d1fae5' };
  }
  if (account.paid === 0) {
    return { label: 'Pendiente', color: '#374151', bg: '#f3f4f6' };
  }
  return { label: 'En curso', color: '#92400e', bg: '#fef3c7' };
}

type CreditAccountDetailViewProps = {
  account: CreditAccountDetail;
  onPayment: (amount: number, paymentMethod: string, notes: string) => Promise<void>;
  onAddNote: (input: { contactType: 'CALL' | 'WHATSAPP' | 'VISIT' | 'OTHER'; result: 'NOTE' | 'PROMISE' | 'NO_CONTACT' | 'PARTIAL_PAYMENT' | 'PAID' | 'OTHER'; notes: string; createdBy: string }) => Promise<void>;
};

export function CreditAccountDetailView({ account, onPayment, onAddNote }: CreditAccountDetailViewProps) {
  const [noteForm, setNoteForm] = useState({ contactType: 'CALL' as const, result: 'NOTE' as const, notes: '' });

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.notes.trim()) return;
    await onAddNote({ ...noteForm, createdBy: 'Admin' });
    setNoteForm({ contactType: 'CALL', result: 'NOTE', notes: '' });
  };

  const accountStatus = getAccountStatusLabel(account);

  return (
    <div>
      {/* CABECERA PRINCIPAL */}
      <section className={styles.section}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>{account.customer.fullName}</h2>
          {account.items && account.items.length > 0 ? (
            <div style={{ margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {account.items.map((item, idx) => (
                <p key={idx} style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                  {item.productName} (x{item.quantity})
                </p>
              ))}
            </div>
          ) : (
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>{account.productName}</p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>N° Tarjeta</p>
            <p style={{ fontWeight: 600, margin: '4px 0 0', fontSize: 16 }}>{account.operationNumber ?? '-'}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Fecha de Venta</p>
            <p style={{ fontWeight: 600, margin: '4px 0 0', fontSize: 16 }}>{formatDateStrict(account.saleDate)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Cantidad</p>
            <p style={{ fontWeight: 600, margin: '4px 0 0', fontSize: 16 }}>{account.quantity ?? 1}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Estado de la Cuenta</p>
            <p style={{ margin: '4px 0 0' }}>
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: accountStatus.bg, color: accountStatus.color, fontWeight: 600 }}>
                {accountStatus.label}
              </span>
            </p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Mes de Origen</p>
            <p style={{ fontWeight: 600, margin: '4px 0 0', fontSize: 16 }}>{formatOriginMonth(account.originMonth)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Año de Origen</p>
            <p style={{ fontWeight: 600, margin: '4px 0 0', fontSize: 16 }}>{account.originYear ?? '-'}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Teléfono</p>
            <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{account.customer.phone ?? '-'}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Email</p>
            <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{account.customer.email ?? '-'}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Dirección</p>
            <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{account.customer.address ?? '-'}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 10, color: '#333' }}>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Cuota</p>
            <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 18 }}>{formatCurrency(account.installmentAmount)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Cuotas</p>
            <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 18 }}>{account.installmentCount}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Total</p>
            <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 18 }}>{formatCurrency(account.total)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Pagado</p>
            <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 18, color: '#065f46' }}>{formatCurrency(account.paid)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Restante</p>
            <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 18, color: account.remaining > 0 ? '#991b1b' : '#065f46' }}>{formatCurrency(account.remaining)}</p>
          </div>
        </div>
      </section>

      {/* BLOQUE RESUMEN ANTES DEL CRONOGRAMA */}
      <section className={styles.section} style={{ background: '#f0f4ff', borderLeft: '4px solid #667eea' }}>
        <h3 className={styles.sectionTitle} style={{ marginTop: 0 }}>Resumen de la Operación</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Cliente</p>
            <p style={{ fontWeight: 600, margin: '4px 0 0', fontSize: 16 }}>{account.customer.fullName}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Tarjeta</p>
            <p style={{ fontWeight: 600, margin: '4px 0 0', fontSize: 16 }}>{account.operationNumber ?? '-'}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Producto(s)</p>
            {account.items && account.items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {account.items.map((item, idx) => (
                  <p key={idx} style={{ fontWeight: 600, margin: '4px 0 0', fontSize: 16 }}>
                    {item.productName} (x{item.quantity})
                  </p>
                ))}
              </div>
            ) : (
              <p style={{ fontWeight: 600, margin: '4px 0 0', fontSize: 16 }}>{account.productName}</p>
            )}
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Fecha de Venta</p>
            <p style={{ fontWeight: 600, margin: '4px 0 0', fontSize: 16 }}>{formatDateStrict(account.saleDate)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Estado</p>
            <p style={{ margin: '4px 0 0' }}>
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: accountStatus.bg, color: accountStatus.color, fontWeight: 600 }}>
                {accountStatus.label}
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Cronograma de Cuotas</h3>
        {account.installments.length === 0 ? (
          <p className={styles.empty}>No hay cuotas generadas</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vencimiento</th>
                  <th>Monto</th>
                  <th>Pagado</th>
                  <th>Restante</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {account.installments.map((inst) => (
                  <tr key={inst.id}>
                    <td>{inst.installmentNumber}</td>
                    <td>{formatDate(inst.dueDate)}</td>
                    <td>{formatCurrency(inst.originalAmount)}</td>
                    <td>{formatCurrency(inst.paidAmount)}</td>
                    <td>{formatCurrency(inst.remainingAmount)}</td>
                    <td>{statusBadge(inst.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Historial de Pagos ({account.payments.length})</h3>
        {account.payments.length === 0 ? (
          <p className={styles.empty}>Aún no se registraron pagos</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Medio</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {account.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.paymentDate)}</td>
                    <td>{formatCurrency(p.amount)}</td>
                    <td>{p.paymentMethod}</td>
                    <td>{p.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Gestiones de Cobranza ({account.collectionNotes.length})</h3>
        {account.collectionNotes.length === 0 ? (
          <p className={styles.empty}>No hay gestiones registradas</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Contacto</th>
                  <th>Resultado</th>
                  <th>Notas</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {account.collectionNotes.map((n) => (
                  <tr key={n.id}>
                    <td>{formatDate(n.createdAt)}</td>
                    <td>{n.contactType}</td>
                    <td>{n.result}</td>
                    <td>{n.notes || '-'}</td>
                    <td>{n.createdBy || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={handleNoteSubmit} style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Tipo de contacto</label>
              <select
                value={noteForm.contactType}
                onChange={(e) => setNoteForm({ ...noteForm, contactType: e.target.value as typeof noteForm.contactType })}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}
              >
                <option value="CALL">Llamada</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="VISIT">Visita</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Resultado</label>
              <select
                value={noteForm.result}
                onChange={(e) => setNoteForm({ ...noteForm, result: e.target.value as typeof noteForm.result })}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}
              >
                <option value="NOTE">Nota</option>
                <option value="PROMISE">Promesa de pago</option>
                <option value="NO_CONTACT">Sin contacto</option>
                <option value="PARTIAL_PAYMENT">Pago parcial</option>
                <option value="PAID">Pagado</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Notas</label>
            <textarea
              value={noteForm.notes}
              onChange={(e) => setNoteForm({ ...noteForm, notes: e.target.value })}
              rows={3}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}
            />
          </div>
          <button type="submit" className={styles.adminActionButton}>Agregar gestion</button>
        </form>
      </section>

      {account.remaining > 0 && (
        <CreditPaymentForm remaining={account.remaining} onSubmit={onPayment} />
      )}
    </div>
  );
}
