import type { FormEvent } from 'react';
import type { AdminSaleDetail, PaymentMethod, SaleStatus } from '@/lib/supabase/types';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import { formatCurrency, getStatusClass } from '@/components/Admin/shared/formatters';
import styles from '@/styles/Admin.module.css';

type EditItem = {
  key: string;
  name: string;
  unitPrice: number;
  quantity: number;
  category: string | null;
  categoryName: string;
  slug: string;
  legacyProductId: number | null;
  installmentCount: number;
};

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
  editDelivery: { fullName: string; phone: string; address: string; city: string; notes: string };
  onEditDeliveryChange: (field: string, value: string) => void;
  editSaleNumber: string;
  onEditSaleNumberChange: (value: string) => void;
  isEditingDelivery: boolean;
  deliveryMessage: string;
  onSaveDelivery: () => void;
  editStatus: SaleStatus;
  onEditStatusChange: (value: SaleStatus) => void;
  isEditingStatus: boolean;
  statusMessage: string;
  onSaveStatus: () => void;
  editItems: EditItem[];
  editDiscount: string;
  onEditDiscountChange: (value: string) => void;
  isEditingItems: boolean;
  itemsMessage: string;
  onItemNameChange: (key: string, name: string) => void;
  onItemPriceChange: (key: string, price: number) => void;
  onItemQuantityChange: (key: string, quantity: number) => void;
  onItemInstallmentCountChange: (key: string, count: number) => void;
  onItemInstallmentAmountChange: (key: string, amount: number) => void;
  onRemoveItem: (key: string) => void;
  onSaveItems: () => void;
  productSearchQuery: string;
  productSearchResults: AdminCatalogProduct[];
  isSearchingProducts: boolean;
  showProductSearch: boolean;
  onShowProductSearchChange: (show: boolean) => void;
  onProductSearchChange: (query: string) => void;
  onAddProduct: (product: AdminCatalogProduct) => void;
};

const STATUS_OPTIONS: SaleStatus[] = ['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'];

function getInputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: '#1e1d1b',
    color: '#f5f2ec',
    border: '1px solid #363330',
    borderRadius: 4,
    padding: '4px 6px',
    fontSize: 12,
    width: '100%',
    boxSizing: 'border-box' as const,
    ...extra,
  };
}

function getLabelStyle(): React.CSSProperties {
  return {
    color: '#8a7e72',
    fontSize: 10,
    display: 'block',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };
}

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
  editDelivery,
  onEditDeliveryChange,
  editSaleNumber,
  onEditSaleNumberChange,
  isEditingDelivery,
  deliveryMessage,
  onSaveDelivery,
  editStatus,
  onEditStatusChange,
  isEditingStatus,
  statusMessage,
  onSaveStatus,
  editItems,
  editDiscount,
  onEditDiscountChange,
  isEditingItems,
  itemsMessage,
  onItemNameChange,
  onItemPriceChange,
  onItemQuantityChange,
  onItemInstallmentCountChange,
  onItemInstallmentAmountChange,
  onRemoveItem,
  onSaveItems,
  productSearchQuery,
  productSearchResults,
  isSearchingProducts,
  showProductSearch,
  onShowProductSearchChange,
  onProductSearchChange,
  onAddProduct,
}: AdminSaleDetailViewProps) {
  const handleRegisterPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRegisterPayment();
  };

  const subtotal = editItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discount = Number(editDiscount) || 0;
  const total = subtotal - discount;

  return (
    <div className={styles.sections}>
      {isLoading && <section className={styles.section}><p className={styles.empty}>Cargando...</p></section>}
      {error && <section className={styles.section}><p className={styles.empty}>{error}</p></section>}

      {sale && (
        <>
          <section className={styles.section}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 auto' }}>
                <label style={getLabelStyle()}>Venta</label>
                <input
                  type="text"
                  value={editSaleNumber}
                  onChange={(e) => onEditSaleNumberChange(e.target.value)}
                  style={getInputStyle({ width: 140 })}
                />
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <label style={getLabelStyle()}>Estado</label>
                <select
                  value={editStatus}
                  onChange={(e) => onEditStatusChange(e.target.value as SaleStatus)}
                  disabled={isEditingStatus}
                  style={getInputStyle({ width: 130 })}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '0 0 auto', paddingTop: 12 }}>
                <button
                  className={styles.compactBtn}
                  onClick={onSaveStatus}
                  disabled={isEditingStatus || editStatus === sale.saleStatus}
                >
                  {isEditingStatus ? '...' : 'Estado'}
                </button>
              </div>
              {statusMessage && (
                <span className={`${styles.editFormMessage} ${statusMessage === 'Error' ? styles.error : styles.success}`}>
                  {statusMessage}
                </span>
              )}
            </div>

            <div className={styles.editFormGrid}>
              <div>
                <label style={getLabelStyle()}>Nombre</label>
                <input
                  type="text"
                  value={editDelivery.fullName}
                  onChange={(e) => onEditDeliveryChange('fullName', e.target.value)}
                  style={getInputStyle()}
                />
              </div>
              <div>
                <label style={getLabelStyle()}>Teléfono</label>
                <input
                  type="text"
                  value={editDelivery.phone}
                  onChange={(e) => onEditDeliveryChange('phone', e.target.value)}
                  style={getInputStyle()}
                />
              </div>
              <div>
                <label style={getLabelStyle()}>Dirección</label>
                <input
                  type="text"
                  value={editDelivery.address}
                  onChange={(e) => onEditDeliveryChange('address', e.target.value)}
                  style={getInputStyle()}
                />
              </div>
              <div>
                <label style={getLabelStyle()}>Ciudad</label>
                <input
                  type="text"
                  value={editDelivery.city}
                  onChange={(e) => onEditDeliveryChange('city', e.target.value)}
                  style={getInputStyle()}
                />
              </div>
              <div className={styles.editFormGridFull}>
                <label style={getLabelStyle()}>Notas</label>
                <input
                  type="text"
                  value={editDelivery.notes}
                  onChange={(e) => onEditDeliveryChange('notes', e.target.value)}
                  placeholder="Opcional"
                  style={getInputStyle()}
                />
              </div>
            </div>
            <div className={styles.editFormActions}>
              <button
                className={styles.compactBtn}
                onClick={onSaveDelivery}
                disabled={isEditingDelivery}
              >
                {isEditingDelivery ? '...' : 'Guardar'}
              </button>
              {deliveryMessage && (
                <span className={`${styles.editFormMessage} ${deliveryMessage === 'Error' ? styles.error : styles.success}`}>
                  {deliveryMessage}
                </span>
              )}
            </div>
          </section>

          <section className={styles.section}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className={styles.sectionTitle} style={{ margin: 0, padding: 0, border: 'none' }}>
                Productos ({editItems.length})
              </span>
              <button
                className={styles.compactBtn}
                onClick={() => onShowProductSearchChange(!showProductSearch)}
              >
                + Agregar
              </button>
            </div>

            {showProductSearch && (
              <div className={styles.productSearchWrapper} style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  value={productSearchQuery}
                  onChange={(e) => onProductSearchChange(e.target.value)}
                  placeholder="Buscar producto..."
                  style={getInputStyle()}
                  autoFocus
                />
                {productSearchResults.length > 0 && (
                  <div className={styles.productSearchDropdown}>
                    {productSearchResults.map((product) => (
                      <div
                        key={product.id}
                        className={styles.productSearchResult}
                        onClick={() => onAddProduct(product)}
                      >
                        <div>
                          <span className={styles.productSearchResultName}>{product.name}</span>
                          <span className={styles.productSearchResultCategory}> — {product.categoryName}</span>
                        </div>
                        <span className={styles.productSearchResultPrice}>{formatCurrency(product.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {isSearchingProducts && (
                  <div style={{ padding: '6px 10px', color: '#8a7e72', fontSize: 11 }}>Buscando...</div>
                )}
              </div>
            )}

            <div style={{ borderBottom: '1px solid #363330', paddingBottom: 4, marginBottom: 4, display: 'flex', gap: 6, fontSize: 10, color: '#8a7e72', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span style={{ flex: 2 }}>Producto</span>
              <span style={{ flex: '0 0 90px', textAlign: 'right' }}>Precio</span>
              <span style={{ flex: '0 0 50px', textAlign: 'center' }}>Cant</span>
              <span style={{ flex: '0 0 90px', textAlign: 'right' }}>Subtotal</span>
              <span style={{ flex: '0 0 20px' }}></span>
            </div>

            {editItems.map((item) => {
              const lineTotal = item.unitPrice * item.quantity;
              const installmentAmount = item.installmentCount > 0 ? Math.round(lineTotal / item.installmentCount) : 0;
              return (
                <div key={item.key} style={{ borderBottom: '1px solid #363330', paddingBottom: 6, marginBottom: 6 }}>
                  <div className={styles.editItemRow} style={{ borderBottom: 'none', padding: 0, marginBottom: 0 }}>
                    <div className={styles.editItemName} style={{ flex: 2 }}>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => onItemNameChange(item.key, e.target.value)}
                        style={getInputStyle({ fontSize: 11, padding: '3px 5px' })}
                      />
                    </div>
                    <div style={{ flex: '0 0 90px' }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.unitPrice}
                        onChange={(e) => onItemPriceChange(item.key, Number(e.target.value))}
                        style={getInputStyle({ fontSize: 11, padding: '3px 5px', textAlign: 'right' })}
                      />
                    </div>
                    <div style={{ flex: '0 0 50px' }}>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => onItemQuantityChange(item.key, Number(e.target.value))}
                        style={getInputStyle({ fontSize: 11, padding: '3px 5px', textAlign: 'center' })}
                      />
                    </div>
                    <div className={styles.editItemPrice} style={{ flex: '0 0 90px' }}>
                      {formatCurrency(lineTotal)}
                    </div>
                    <button
                      className={styles.editItemRemove}
                      onClick={() => onRemoveItem(item.key)}
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                  <div className={styles.editItemInstallments}>
                    <input
                      type="number"
                      min="1"
                      value={item.installmentCount}
                      onChange={(e) => onItemInstallmentCountChange(item.key, Number(e.target.value))}
                      style={getInputStyle({ width: 40, fontSize: 10, padding: '1px 4px', textAlign: 'right', display: 'inline-block' })}
                    />
                    {' cuotas de '}
                    <input
                      type="number"
                      min="1"
                      step="100"
                      value={installmentAmount}
                      onChange={(e) => onItemInstallmentAmountChange(item.key, Number(e.target.value))}
                      style={getInputStyle({ width: 80, fontSize: 10, padding: '1px 4px', textAlign: 'right', display: 'inline-block' })}
                    />
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid #363330', flexWrap: 'wrap' }}>
              <div>
                <label style={getLabelStyle()}>Subtotal</label>
                <span style={{ color: '#f5f2ec', fontSize: 12, fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
              </div>
              <div>
                <label style={getLabelStyle()}>Descuento</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editDiscount}
                  onChange={(e) => onEditDiscountChange(e.target.value)}
                  style={getInputStyle({ width: 80, fontSize: 11, padding: '3px 5px' })}
                />
              </div>
              <div>
                <label style={getLabelStyle()}>Total</label>
                <span style={{ color: '#c8a87c', fontSize: 13, fontWeight: 700 }}>{formatCurrency(total)}</span>
              </div>
              <div style={{ marginLeft: 'auto', paddingTop: 12 }}>
                <button
                  className={styles.compactBtn}
                  onClick={onSaveItems}
                  disabled={isEditingItems}
                >
                  {isEditingItems ? '...' : 'Guardar'}
                </button>
                {itemsMessage && (
                  <span className={`${styles.editFormMessage} ${itemsMessage === 'Error' ? styles.error : styles.success}`} style={{ marginLeft: 6 }}>
                    {itemsMessage}
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Pagos ({sale.payments.length})</h2>

            {sale.remainingAmount > 0 && (
              <form onSubmit={handleRegisterPayment} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <label style={getLabelStyle()}>Monto</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(event) => onPaymentAmountChange(event.target.value)}
                      required
                      style={getInputStyle({ width: 100 })}
                    />
                  </div>
                  <div>
                    <label style={getLabelStyle()}>Método</label>
                    <select value={paymentMethod} onChange={(event) => onPaymentMethodChange(event.target.value as PaymentMethod)} style={getInputStyle({ width: 120 })}>
                      <option value="CASH">Efectivo</option>
                      <option value="BANK_TRANSFER">Transferencia</option>
                      <option value="MERCADO_PAGO">Mercado Pago</option>
                      <option value="CREDIT_CARD">Crédito</option>
                      <option value="DEBIT_CARD">Débito</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label style={getLabelStyle()}>Fecha</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(event) => onPaymentDateChange(event.target.value)}
                      required
                      style={getInputStyle({ width: 120 })}
                    />
                  </div>
                  <div>
                    <label style={getLabelStyle()}>Notas</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(event) => onPaymentNotesChange(event.target.value)}
                      placeholder="Opcional"
                      style={getInputStyle({ width: 120 })}
                    />
                  </div>
                  <div>
                    <button className={styles.compactBtn} type="submit" disabled={isRegisteringPayment}>
                      {isRegisteringPayment ? '...' : 'Registrar'}
                    </button>
                  </div>
                </div>
                {paymentError && <p className={styles.empty} style={{ textAlign: 'left', padding: '4px 0' }}>{paymentError}</p>}
              </form>
            )}

            {sale.installments.length === 0 && (
              <p className={styles.empty}>Sin cuotas</p>
            )}
            {sale.remainingAmount <= 0 && sale.installments.length > 0 && (
              <p className={styles.empty}>Pago completo</p>
            )}

            {sale.payments.length > 0 && (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Monto</th>
                      <th>Método</th>
                      <th>Estado</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{new Date(payment.paymentDate).toLocaleDateString('es-AR')}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{payment.paymentMethod}</td>
                        <td>
                          <span className={`${styles.status} ${styles[getStatusClass(payment.status === 'CONFIRMED' ? 'PAID' : payment.status === 'VOIDED' ? 'CANCELLED' : 'PENDING')]}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td>{payment.notes ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {sale.payments.length === 0 && (
              <p className={styles.empty}>No hay pagos registrados</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
