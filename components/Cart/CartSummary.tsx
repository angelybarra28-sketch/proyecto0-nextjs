'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cartContext';
import styles from '@/styles/Cart.module.css';

interface CartSummaryProps {
  onWhatsApp: () => void;
}

export default function CartSummary({ onWhatsApp }: CartSummaryProps) {
  const { getTotalPrice, getSubtotal, getDiscountTotal, items } = useCart();

  const subtotal = getSubtotal();
  const discount = getDiscountTotal();
  const total = getTotalPrice();
  return (
    <div className={styles.cartSummary}>
      <h2 className={styles.summaryTitle}>Resumen de compra</h2>

      {/* Items Count */}
      <div className={styles.summarySection}>
        <div className={styles.summaryRow}>
          <span>Productos ({items.length})</span>
          <span className={styles.price}>
            ${subtotal.toLocaleString('es-AR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          </span>
        </div>
      </div>

      {/* Envío */}
      <div className={styles.summarySection}>
        <div className={styles.summaryRow}>
          <span>Envío</span>
          <span className={styles.freeShipping}>Gratis</span>
        </div>
        <div className={styles.shippingBar}>
          <div className={styles.shippingProgress}></div>
        </div>
        <p className={styles.shippingText}>
          Envío gratis en tu compra
        </p>
      </div>

      {/* Descuentos */}
      {discount > 0 && (
        <div className={styles.summarySection}>
          <div className={styles.summaryRow}>
            <span>Descuentos</span>
            <span className={styles.discount}>
              −${discount.toLocaleString('es-AR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </span>
          </div>
        </div>
      )}

      {/* Total */}
      <div className={styles.totalSection}>
        <div className={styles.summaryRow + ' ' + styles.totalRow}>
          <span className={styles.totalLabel}>Total</span>
          <span className={styles.totalPrice}>
            ${total.toLocaleString('es-AR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          </span>
        </div>
      </div>

      {/* Cuotas */}
      {items.length > 0 && (
        <div className={styles.summaryInstallments}>
          <span className={styles.summaryInstallment}>
            8 cuotas de ${Math.round(total / 8).toLocaleString('es-AR')}
          </span>
          <span className={styles.summaryInstallment}>
            9 cuotas de ${Math.round(total / 9).toLocaleString('es-AR')}
          </span>
          <span className={styles.summaryInstallment}>
            10 cuotas de ${Math.round(total / 10).toLocaleString('es-AR')}
          </span>
          <span className={styles.summaryInstallment + ' ' + styles.summaryInstallmentHighlight}>
            12 cuotas de ${Math.round(total / 12).toLocaleString('es-AR')}
          </span>
        </div>
      )}

      {/* CTA Button */}
      {items.length > 0 ? (
        <button onClick={onWhatsApp} className={styles.checkoutButton}>
          Continuar compra
        </button>
      ) : (
        <button className={styles.checkoutButton + ' ' + styles.disabled} disabled>
          Carrito vacío
        </button>
      )}

      {/* Ver más productos */}
      <Link href="/" className={styles.continueShoppingLink}>
        Ver más productos
      </Link>
    </div>
  );
}
