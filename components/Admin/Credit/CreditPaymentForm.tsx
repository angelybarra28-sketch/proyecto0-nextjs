import { useState } from 'react';
import styles from '@/styles/Admin.module.css';

type CreditPaymentFormProps = {
  remaining: number;
  onSubmit: (amount: number, paymentMethod: string, notes: string) => Promise<void>;
};

export function CreditPaymentForm({ remaining, onSubmit }: CreditPaymentFormProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0 || value > remaining) return;
    setIsSubmitting(true);
    try {
      await onSubmit(value, paymentMethod, notes);
      setAmount('');
      setPaymentMethod('EFECTIVO');
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.section} style={{ marginTop: 16 }}>
      <h3 className={styles.sectionTitle}>Registrar Pago</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: '#b8a89c' }}>
          Monto
          <input
            type="number"
            step="0.01"
            min={0.01}
            max={remaining}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={{ minHeight: 38, border: '1px solid #363330', background: '#1e1d1b', color: '#f5f2ec', borderRadius: 8, padding: '8px 10px' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: '#b8a89c' }}>
          Medio de Pago
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            style={{ minHeight: 38, border: '1px solid #363330', background: '#1e1d1b', color: '#f5f2ec', borderRadius: 8, padding: '8px 10px' }}
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="MERCADO_PAGO">Mercado Pago</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="OTRO">Otro</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: '#b8a89c' }}>
          Observaciones
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ minHeight: 38, border: '1px solid #363330', background: '#1e1d1b', color: '#f5f2ec', borderRadius: 8, padding: '8px 10px' }}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={isSubmitting || !amount || Number(amount) <= 0 || Number(amount) > remaining}
        className={styles.adminActionButton}
      >
        {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
      </button>
    </form>
  );
}
