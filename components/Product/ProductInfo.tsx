'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cartContext';
import styles from '@/styles/ProductDetail.module.css';

interface ProductInfoProps {
  productId: number;
  name: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  description: string;
  specifications: {
    size: string;
    material: string;
    firmness: string;
    withPillow: string;
    color: string;
  };
  features: string[];
}

export default function ProductInfo({
  productId,
  name,
  price,
  originalPrice,
  discount,
  description,
  specifications,
  features
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
        imageUrl: '/images/sabana%201.webp'
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
        imageUrl: '/images/sabana%201.webp'
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

      {/* Especificaciones */}
      <div className={styles.specifications}>
        <h3>Lo que tenés que saber de este producto</h3>
        <div className={styles.specsList}>
          <div className={styles.specItem}>
            <span className={styles.specLabel}>Tamaño:</span>
            <span className={styles.specValue}>{specifications.size}</span>
          </div>
          <div className={styles.specItem}>
            <span className={styles.specLabel}>Material:</span>
            <span className={styles.specValue}>{specifications.material}</span>
          </div>
          <div className={styles.specItem}>
            <span className={styles.specLabel}>Firmeza:</span>
            <span className={styles.specValue}>{specifications.firmness}</span>
          </div>
          <div className={styles.specItem}>
            <span className={styles.specLabel}>Con almohada:</span>
            <span className={styles.specValue}>{specifications.withPillow}</span>
          </div>
          <div className={styles.specItem}>
            <span className={styles.specLabel}>Color:</span>
            <span className={styles.specValue}>{specifications.color}</span>
          </div>
        </div>
      </div>

      {/* Características */}
      <div className={styles.characteristics}>
        <h3>Características del producto</h3>
        <div className={styles.featuresList}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureItem}>
              <span className={styles.featureBullet}>•</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
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

        <button className={styles.buyButton} onClick={handleBuyNow}>Comprar ahora</button>
        
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
