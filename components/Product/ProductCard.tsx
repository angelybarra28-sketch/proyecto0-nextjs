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
    <Link href={`/producto/${slug}`} className={styles.card}>
      <div className={styles.imageContainer}>
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

        <div className={styles.overlay}>
          <h3 className={styles.productName}>{name}</h3>
          {hasCuotas ? (
            <div className={styles.installmentRow}>{cuotaText}</div>
          ) : (
            <div className={styles.productPrice}>{price}</div>
          )}
          <button className={styles.productButton}>Ver Detalles</button>
        </div>
      </div>
    </Link>
  );
}
