'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import ProductCard from '@/components/Product/ProductCard';
import styles from '@/styles/ProductsSection.module.css';

interface Product {
  id: number;
  name: string;
  price: string;
  discount?: string;
  imageUrl?: string;
  slug: string;
  installmentCount?: number;
  installmentAmount?: number;
}

interface ProductsSectionProps {
  title: string;
  products: Product[];
  id?: string;
}

export default function ProductsSection({ title, products, id }: ProductsSectionProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [contentFits, setContentFits] = useState(true);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const check = () => setContentFits(el.scrollWidth <= el.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [products]);

  const scrollCarousel = useCallback((direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const card = carouselRef.current.querySelector('*');
    if (!card) return;
    const cardWidth = card.clientWidth + 24;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;

    if (direction === 'right') {
      if (scrollLeft + clientWidth >= scrollWidth - 2) {
        carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }
    } else {
      if (scrollLeft <= 0) {
        carouselRef.current.scrollTo({ left: scrollWidth - clientWidth, behavior: 'smooth' });
        return;
      }
    }

    carouselRef.current.scrollBy({
      left: direction === 'left' ? -cardWidth : cardWidth,
      behavior: 'smooth',
    });
  }, []);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (products.length <= 1) return;
    intervalRef.current = setInterval(() => {
      scrollCarousel('right');
    }, 2500);
  }, [products.length, scrollCarousel]);

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoPlay]);

  if (products.length === 0) return null;

  return (
    <section id={id} className={styles.productsSection}>
      <div className={styles.productsWrapper}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div className={styles.carouselWrapper}>
          {!contentFits && (
            <button className={styles.arrow} onClick={() => scrollCarousel('left')} aria-label="Anterior">
              ‹
            </button>
          )}
          <div
            className={`${styles.carousel} ${!contentFits ? styles.carouselOverflow : ''}`}
            ref={carouselRef}
            onMouseEnter={stopAutoPlay}
            onMouseLeave={startAutoPlay}
          >
            {products.map((product, index) => (
              <div key={product.id} className={styles.carouselCard}>
                <ProductCard
                  productId={product.id}
                  name={product.name}
                  price={product.price}
                  discount={product.discount}
                  imageUrl={product.imageUrl}
                  productIndex={index}
                  slug={product.slug}
                  installmentCount={product.installmentCount}
                  installmentAmount={product.installmentAmount}
                />
              </div>
            ))}
          </div>
          {!contentFits && (
            <button className={styles.arrow} onClick={() => scrollCarousel('right')} aria-label="Siguiente">
              ›
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
