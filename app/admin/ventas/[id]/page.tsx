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
        editDelivery={saleDetail.editDelivery}
        onEditDeliveryChange={(field, value) =>
          saleDetail.setEditDelivery((prev) => ({ ...prev, [field]: value }))
        }
        editSaleNumber={saleDetail.editSaleNumber}
        onEditSaleNumberChange={saleDetail.setEditSaleNumber}
        editStatus={saleDetail.editStatus}
        onEditStatusChange={saleDetail.setEditStatus}
        editItems={saleDetail.editItems}
        editDiscount={saleDetail.editDiscount}
        onEditDiscountChange={saleDetail.setEditDiscount}
        isSaving={saleDetail.isSaving}
        saveMessage={saleDetail.saveMessage}
        onSaveAll={saleDetail.handleSaveAll}
        onItemNameChange={saleDetail.handleItemNameChange}
        onItemPriceChange={saleDetail.handleItemPriceChange}
        onItemQuantityChange={saleDetail.handleItemQuantityChange}
        onItemInstallmentCountChange={saleDetail.handleItemInstallmentCountChange}
        onItemInstallmentAmountChange={saleDetail.handleItemInstallmentAmountChange}
        onRemoveItem={saleDetail.handleRemoveItem}
        productSearchQuery={saleDetail.productSearchQuery}
        productSearchResults={saleDetail.productSearchResults}
        isSearchingProducts={saleDetail.isSearchingProducts}
        showProductSearch={saleDetail.showProductSearch}
        onShowProductSearchChange={saleDetail.setShowProductSearch}
        onProductSearchChange={saleDetail.handleSearchProducts}
        onAddProduct={saleDetail.handleAddProduct}
      />

      <div className={styles.backLink}>
        <Link href="/admin/ventas">Volver a ventas</Link>
      </div>
    </div>
  );
}
