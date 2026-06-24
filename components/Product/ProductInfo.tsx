'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cartContext';
import styles from '@/styles/ProductDetail.module.css';

interface ProductInfoProps {
  productId: number;
  name: string;
  price: string;
  imageUrl: string;
  originalPrice?: string;
  discount?: string;
  description: string;
}

export default function ProductInfo({
  productId,
  name,
  price,
  imageUrl,
  originalPrice,
  discount,
  description,
}: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const router = useRouter();
  const { addToCart } = useCart();

  const incrementQuantity = () => setQuantity(q => q + 1);
  const decrementQuantity = () => setQuantity(q => (q > 1 ? q - 1 : 1));

  const handleBuyNow = () => {
    const priceNum = parseInt(price.replace(/[$.,]/g, ''));
    const originalPriceNum = originalPrice 
      ? parseInt(originalPrice.replace(/[$.,]/g, ''))
      : undefined;

    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: productId,
        name,
        price: priceNum,
        originalPrice: originalPriceNum,
        discount,
        imageUrl
      });
    }

    router.push('/checkout');
  };

  const handleAddToCart = () => {
    const priceNum = parseInt(price.replace(/[$.,]/g, ''));
    const originalPriceNum = originalPrice 
      ? parseInt(originalPrice.replace(/[$.,]/g, ''))
      : undefined;

    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: productId,
        name,
        price: priceNum,
        originalPrice: originalPriceNum,
        discount,
        imageUrl
      });
    }

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
    setQuantity(1);
  };

  return (
    <div className={styles.productInfo}>
      {/* Título y Descripción */}
      <div className={styles.header}>
        <h1 className={styles.title}>{name}</h1>
        <p className={styles.description}>{description}</p>
      </div>

      {/* Precios */}
      <div className={styles.pricing}>
        {originalPrice && <span className={styles.originalPrice}>{originalPrice}</span>}
        <div className={styles.priceRow}>
          <span className={styles.currentPrice}>{price}</span>
          {discount && <span className={styles.discount}>{discount}</span>}
        </div>
        <p className={styles.shippingInfo}>Llega gratis el lunes</p>
      </div>

      {/* Cantidad y Botones */}
      <div className={styles.actions}>
        <div className={styles.quantityControl}>
          <label htmlFor="quantity">Cantidad:</label>
          <div className={styles.quantityButtons}>
            <button onClick={decrementQuantity}>−</button>
            <input 
              id="quantity"
              type="number" 
              value={quantity} 
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              readOnly
            />
            <button onClick={incrementQuantity}>+</button>
          </div>
        </div>

        <button className={styles.buyButton} onClick={handleBuyNow}>Contactar con el vendedor para consultar por mi pedido</button>
        
        <button 
          className={`${styles.cartButton} ${addedToCart ? styles.addedSuccess : ''}`}
          onClick={handleAddToCart}
        >
          {addedToCart ? '✓ Agregado al carrito' : '🛒 Agregar al carrito'}
        </button>
      </div>
    </div>
  );
}
