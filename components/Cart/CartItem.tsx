'use client';

import { useCart, CartItem } from '@/lib/cartContext';
import Image from 'next/image';
import styles from '@/styles/Cart.module.css';

interface CartItemComponentProps {
  item: CartItem;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
}

export default function CartItemComponent({
  item,
  isSelected,
  onSelect
}: CartItemComponentProps) {
  const { updateQuantity, removeFromCart } = useCart();

  const handleIncrement = () => {
    updateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    }
  };

  const totalPrice = item.price * item.quantity;
  const installmentCount = item.installmentCount ?? 8;
  const installmentAmount = item.installmentAmount ?? Math.round(totalPrice / installmentCount);
  const priceFormatted = `$${totalPrice.toLocaleString('es-AR')}`;
  const cuotaText = `${installmentCount} cuotas de $${installmentAmount.toLocaleString('es-AR')}`;

  return (
    <div className={styles.cartItemCard}>
      {/* Checkbox */}
      {isSelected !== undefined && onSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          className={styles.cardCheckbox}
        />
      )}

      {/* Imagen */}
      <div className={styles.cardImage}>
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          className={styles.cardImageInner}
        />
      </div>

      {/* Datos del producto */}
      <div className={styles.cardBody}>
        <h3 className={styles.cardName}>{item.name}</h3>
        <div className={styles.cardInstallments}>{cuotaText}</div>
        <div className={styles.cardPrice}>{priceFormatted}</div>
      </div>

      {/* Controles inferiores */}
      <div className={styles.cardFooter}>
        <div className={styles.quantityControl}>
          <button onClick={handleDecrement} className={styles.qtyBtn}>−</button>
          <input
            type="number"
            value={item.quantity}
            readOnly
            className={styles.qtyInput}
          />
          <button onClick={handleIncrement} className={styles.qtyBtn}>+</button>
        </div>
        <button
          onClick={() => removeFromCart(item.id)}
          className={styles.removeBtn}
          title="Eliminar"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
