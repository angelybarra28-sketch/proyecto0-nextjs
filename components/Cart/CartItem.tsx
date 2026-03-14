'use client';

import { useCart, CartItem } from '@/lib/cartContext';
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

  const discount = item.originalPrice 
    ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100) 
    : 0;

  return (
    <div className={styles.cartItemContainer}>
      <div className={styles.cartItem}>
        {/* Checkbox */}
        {isSelected !== undefined && onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(item.id)}
            className={styles.checkbox}
          />
        )}

        {/* Imagen */}
        <div className={styles.itemImage}>
          <img
            src={item.imageUrl}
            alt={item.name}
            className={styles.image}
          />
        </div>

        {/* Información */}
        <div className={styles.itemInfo}>
          <h3 className={styles.itemName}>{item.name}</h3>
          <p className={styles.itemDesc}>
            {item.quantity > 1 && `${item.quantity} ×`}
          </p>
        </div>

        {/* Cantidad */}
        <div className={styles.quantityControl}>
          <button onClick={handleDecrement} className={styles.qtyBtn}>−</button>
          <input
            type="number"
            value={item.quantity}
            readOnly
            className={styles.qtyInput}
          />
          <button onClick={handleIncrement} className={styles.qtyBtn}>+</button>
          <span className={styles.available}>+50 disponibles</span>
        </div>

        {/* Precios */}
        <div className={styles.priceSection}>
          {item.originalPrice && (
            <>
              <span className={styles.originalPrice}>${item.originalPrice}</span>
              <span className={styles.discountBadge}>{discount}% OFF</span>
            </>
          )}
          <div className={styles.currentPrice}>
            ${(item.price * item.quantity).toLocaleString('es-AR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          </div>
        </div>

        {/* Eliminar */}
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
