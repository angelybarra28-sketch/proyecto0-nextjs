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
  slug: string;
  installmentCount?: number;
  installmentAmount?: number;
}

export default function ProductCard({
  name,
  price,
  discount,
  imageUrl,
  slug,
  installmentCount,
  installmentAmount,
}: ProductCardProps) {
  const hasCuotas = installmentCount && installmentAmount;
  const cuotaText = hasCuotas
    ? `${installmentCount} cuotas de $${installmentAmount.toLocaleString('es-AR')}`
    : '';

  return (
    <div className={styles.productCard}>
      <Link href={`/producto/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
          {hasCuotas ? (
            <div className={styles.installmentRow}>{cuotaText}</div>
          ) : (
            <div className={styles.productPrice}>{price}</div>
          )}
          <button className={styles.productButton}>Ver Detalles</button>
        </div>
      </Link>
    </div>
  );
}
