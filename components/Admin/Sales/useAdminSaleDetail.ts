import { useEffect, useState } from 'react';
import { fetchAdminSaleDetail, registerAdminSalePayment } from '@/lib/services/admin/client';
import type { AdminSaleDetail, PaymentMethod } from '@/lib/supabase/types';

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

type UseAdminSaleDetailParams = {
  isAdmin: boolean;
  saleId: string;
};

export function useAdminSaleDetail({ isAdmin, saleId }: UseAdminSaleDetailParams) {
  const [sale, setSale] = useState<AdminSaleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const controller = new AbortController();

    fetchAdminSaleDetail(saleId, controller.signal)
      .then(setSale)
      .catch((loadError: unknown) => {
        if (isAbortError(loadError)) return;
        console.error('Error loading sale detail:', loadError);
        setError('No se pudo cargar el detalle de la venta');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [isAdmin, saleId]);

  const registerPayment = async () => {
    if (!sale) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Ingresá un monto válido');
      return;
    }

    setIsRegisteringPayment(true);
    setPaymentError('');

    try {
      await registerAdminSalePayment({
        saleId: sale.id,
        amount,
        paymentMethod,
        paymentDate,
        notes: paymentNotes || undefined,
      });

      const updatedSale = await fetchAdminSaleDetail(sale.id);
      setSale(updatedSale);
      setPaymentAmount('');
      setPaymentNotes('');
    } catch (paymentLoadError: unknown) {
      console.error('Error registering payment:', paymentLoadError);
      setPaymentError(paymentLoadError instanceof Error ? paymentLoadError.message : 'No se pudo registrar el pago');
    } finally {
      setIsRegisteringPayment(false);
    }
  };

  return {
    sale,
    isLoading,
    error,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentDate,
    setPaymentDate,
    paymentNotes,
    setPaymentNotes,
    paymentError,
    isRegisteringPayment,
    registerPayment,
  };
}
