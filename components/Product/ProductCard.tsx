'use client';

import Image from 'next/image';
import styles from '@/styles/ProductCard.module.css';

interface ProductCardProps {
  name: string;
  price: string;
  discount?: string;
  imageUrl?: string;
  productIndex: number;
}

export default function ProductCard({
  name,
  price,
  discount,
  imageUrl,
  productIndex
}: ProductCardProps) {
  return (
    <div className={styles.productCard}>
      <div className={styles.productImage}>
        {discount && <div className={styles.discountBadge}>{discount}</div>}

        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholder}>
            <span>📸 Imagen no disponible</span>
          </div>
        )}
      </div>

      <div className={styles.productInfo}>
        <h3 className={styles.productName}>{name}</h3>
        <div className={styles.productPrice}>{price}</div>
        <button className={styles.productButton}>Ver Detalles</button>
      </div>
    </div>
  );
}
