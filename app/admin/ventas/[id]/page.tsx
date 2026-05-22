'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminSaleDetailView } from '@/components/Admin/Sales/AdminSaleDetailView';
import { useAdminSaleDetail } from '@/components/Admin/Sales/useAdminSaleDetail';
import { useAuth } from '@/lib/authContext';
import styles from '@/styles/Admin.module.css';

export default function AdminSaleDetailPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const saleDetail = useAdminSaleDetail({ isAdmin, saleId: params.id });

  useEffect(() => {
    if (!isAdmin) {
      router.push('/auth');
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Detalle de Venta</h1>

      <AdminSaleDetailView
        sale={saleDetail.sale}
        isLoading={saleDetail.isLoading}
        error={saleDetail.error}
        paymentAmount={saleDetail.paymentAmount}
        onPaymentAmountChange={saleDetail.setPaymentAmount}
        paymentMethod={saleDetail.paymentMethod}
        onPaymentMethodChange={saleDetail.setPaymentMethod}
        paymentDate={saleDetail.paymentDate}
        onPaymentDateChange={saleDetail.setPaymentDate}
        paymentNotes={saleDetail.paymentNotes}
        onPaymentNotesChange={saleDetail.setPaymentNotes}
        paymentError={saleDetail.paymentError}
        isRegisteringPayment={saleDetail.isRegisteringPayment}
        onRegisterPayment={saleDetail.registerPayment}
      />

      <div className={styles.backLink}>
        <Link href="/admin">Volver al panel</Link>
      </div>
    </div>
  );
}
