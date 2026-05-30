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
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;
    const controller = new AbortController();

    fetchAdminSaleDetail(saleId, controller.signal)
      .then((data) => {
        if (!isMounted) return;
        setSale(data);
      })
      .catch((loadError: unknown) => {
        if (isAbortError(loadError) || !isMounted) return;
        console.error('Error loading sale detail:', loadError);
        setError('No se pudo cargar el detalle de la venta');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isAdmin, saleId]);

  const registerPayment = async () => {
    if (!sale || isRegisteringPayment) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Ingresá un monto válido');
      return;
    }

    if (amount > sale.remainingAmount) {
      setPaymentError('El monto no puede superar el saldo pendiente');
      return;
    }

    const parsedPaymentDate = new Date(paymentDate);
    const maxPaymentDate = new Date();
    maxPaymentDate.setDate(maxPaymentDate.getDate() + 7);

    if (!paymentDate || Number.isNaN(parsedPaymentDate.getTime()) || parsedPaymentDate > maxPaymentDate) {
      setPaymentError('Ingresá una fecha de pago válida');
      return;
    }

    setIsRegisteringPayment(true);
    setPaymentError('');
    const requestId = paymentRequestId ?? crypto.randomUUID();
    setPaymentRequestId(requestId);

    try {
      await registerAdminSalePayment({
        saleId: sale.id,
        paymentRequestId: requestId,
        amount,
        paymentMethod,
        paymentDate,
        notes: paymentNotes || undefined,
      });

      const updatedSale = await fetchAdminSaleDetail(sale.id);
      setSale(updatedSale);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentRequestId(null);
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
