'use client';

import { useRef, useCallback } from 'react';
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

  if (products.length === 0) return null;

  const scrollCarousel = useCallback((direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const card = carouselRef.current.querySelector('*');
    if (!card) return;
    const cardWidth = card.clientWidth + 24;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -cardWidth : cardWidth,
      behavior: 'smooth',
    });
  }, []);

  return (
    <section id={id} className={styles.productsSection}>
      <div className={styles.productsWrapper}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div className={styles.carouselWrapper}>
          <button className={styles.arrow} onClick={() => scrollCarousel('left')} aria-label="Anterior">
            ‹
          </button>
          <div className={styles.carousel} ref={carouselRef}>
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
          <button className={styles.arrow} onClick={() => scrollCarousel('right')} aria-label="Siguiente">
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
