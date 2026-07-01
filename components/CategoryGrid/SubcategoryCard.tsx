'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/styles/SubcategoryCard.module.css';

interface SubcategoryProduct {
  imageUrl: string | null;
  carouselImages: string[] | null;
  name: string;
  slug: string;
}

interface SubcategoryCardProps {
  name: string;
  slug: string;
  products: SubcategoryProduct[];
}

export default function SubcategoryCard({ name, slug, products }: SubcategoryCardProps) {
  const images = useMemo(() => {
    return products.flatMap(p => {
      if (p.carouselImages && p.carouselImages.length > 0) return p.carouselImages;
      if (p.imageUrl) return [p.imageUrl];
      return [];
    });
  }, [products]);

  const initialIndex = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
      hash = ((hash << 5) - hash) + slug.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % Math.max(images.length, 1);
  }, [slug, images.length]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loaded, setLoaded] = useState<Set<number>>(new Set([initialIndex]));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const next = (prev + 1) % images.length;
        return next;
      });
    }, 2500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    setLoaded(prev => new Set(prev).add(currentIndex));
  }, [currentIndex, images.length]);

  const hasImages = images.length > 0;
  const showArrows = images.length > 1;

  function goTo(index: number) {
    setCurrentIndex(index);
  }

  return (
    <Link href={`/categoria/${slug}`} className={styles.card}>
      <div className={styles.imageContainer}>
        {hasImages ? (
          images.map((src, i) => (
            <div
              key={i}
              className={`${styles.imageWrapper} ${i === currentIndex ? styles.active : styles.inactive}`}
            >
              <Image
                src={src}
                alt={`${name} - ${i + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className={styles.image}
                priority={i === 0}
                loading={i === 0 ? undefined : 'lazy'}
              />
            </div>
          ))
        ) : (
          <div className={styles.placeholder}>
            <span>Sin imágenes</span>
          </div>
        )}

        {showArrows && (
          <>
            <button
              className={`${styles.navArrow} ${styles.navPrev}`}
              onClick={e => {
                e.preventDefault();
                goTo(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
              }}
              aria-label="Imagen anterior"
            >
              ‹
            </button>
            <button
              className={`${styles.navArrow} ${styles.navNext}`}
              onClick={e => {
                e.preventDefault();
                goTo((currentIndex + 1) % images.length);
              }}
              aria-label="Siguiente imagen"
            >
              ›
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className={styles.dots}>
            {images.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === currentIndex ? styles.dotActive : ''}`}
                onClick={e => {
                  e.preventDefault();
                  goTo(i);
                }}
                aria-label={`Imagen ${i + 1}`}
              />
            ))}
          </div>
        )}

        <div className={styles.overlay}>
          <h3 className={styles.subcategoryName}>{name}</h3>
        </div>
      </div>
    </Link>
  );
}
