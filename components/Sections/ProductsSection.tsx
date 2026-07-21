'use client';

import { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import ProductCard from '@/components/Product/ProductCard';
import styles from '@/styles/ProductsSection.module.css';
import AOS from 'aos';

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

function getVisibleCount(): number {
  if (typeof window === 'undefined') return 4;
  const w = window.innerWidth;
  if (w <= 768) return 2;
  if (w >= 2000) return 8;
  if (w >= 1700) return 7;
  if (w >= 1400) return 5;
  return 4;
}

interface ProductsSectionProps {
  title?: string;
  subtitle?: string;
  products: Product[];
  id?: string;
}

export default function ProductsSection({ title, subtitle, products, id }: ProductsSectionProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [contentFits, setContentFits] = useState(true);
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const check = () => setContentFits(el.scrollWidth <= el.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [products]);

  useLayoutEffect(() => {
    setVisibleCount(getVisibleCount());
  }, []);

  useEffect(() => {
    function update() { setVisibleCount(getVisibleCount()); AOS.refresh(); }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoPlay = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (products.length <= 1) return;
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        scrollCarousel('right');
      }, 5000);
    }, 2000);
  }, [products.length, scrollCarousel]);

  const stopAutoPlay = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoPlay]);

  if (products.length === 0) return null;

  return (
    <section id={id} className={styles.productsSection}>
      <div className={styles.productsWrapper}>
        {title && <h2 className={styles.sectionTitle}>{title}</h2>}
        {subtitle && <h3 className={styles.subtitle}>{subtitle}</h3>}
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
            {products.map((product, index) => {
              const shouldAnimate = visibleCount > 2 || index < visibleCount;
              const aos = shouldAnimate ? ((index % visibleCount) < visibleCount / 2 ? 'fade-right' : 'fade-left') : undefined;
              return (
                <div key={product.id} className={styles.carouselCard} data-aos={aos}>
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
              );
            })}
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
