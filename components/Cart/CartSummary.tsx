'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cartContext';
import styles from '@/styles/Cart.module.css';

interface CartSummaryProps {
  selectedItemsCount?: number;
}

export default function CartSummary({ selectedItemsCount }: CartSummaryProps) {
  const { getTotalPrice, getSubtotal, getDiscountTotal, items } = useCart();

  const subtotal = getSubtotal();
  const discount = getDiscountTotal();
  const total = getTotalPrice();
  const shippingCost = 0; // Envío gratis

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

      {/* CTA Button */}
      {items.length > 0 ? (
        <Link href="/checkout" className={styles.checkoutButton}>
          Continuar compra
        </Link>
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
