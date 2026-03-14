'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from '@/styles/ProductCard.module.css';

interface ProductCardProps {
  name: string;
  price: string;
  discount?: string;
  imageUrl?: string;
  productIndex: number;
  productId: number;
}

export default function ProductCard({
  name,
  price,
  discount,
  imageUrl,
  productIndex,
  productId
}: ProductCardProps) {
  return (
    <div className={styles.productCard}>
      <Link href={`/detalles/${productId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
      </Link>
    </div>
  );
}
