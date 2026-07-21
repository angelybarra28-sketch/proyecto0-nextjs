'use client';

import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import ProductCard from '@/components/Product/ProductCard';
import type { Product } from '@/lib/types';
import AOS from 'aos';
import { BLANQUERIA_CATEGORIES, HOGAR_CATEGORIES } from '@/lib/categoryGroups';
import { normalizeCategory } from '@/lib/categoryUtils';
import styles from '@/styles/TabbedProductsSection.module.css';

function getVisibleCount(): number {
  if (typeof window === 'undefined') return 4;
  const w = window.innerWidth;
  if (w <= 768) return 2;
  if (w >= 2000) return 8;
  if (w >= 1700) return 7;
  if (w >= 1400) return 5;
  return 4;
}

interface TabbedProductsSectionProps {
  products: Product[];
  id?: string;
}

function getFeaturedByCategory(products: Product[], categories: string[]): Product[] {
  const normalizedSet = new Set(categories.map(normalizeCategory));
  const featured = products.filter(
    (p) => p.destacado && normalizedSet.has(normalizeCategory(p.categoria))
  );
  if (featured.length > 0) return featured.slice(0, 8);
  const fallback = products.filter((p) =>
    normalizedSet.has(normalizeCategory(p.categoria))
  );
  return fallback.slice(0, 8);
}

export default function TabbedProductsSection({ products, id }: TabbedProductsSectionProps) {
  const [activeTab, setActiveTab] = useState<'blanqueria' | 'hogar'>('blanqueria');
  const [animating, setAnimating] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(4);

  const tabProducts = useMemo(
    () => ({
      blanqueria: getFeaturedByCategory(products, BLANQUERIA_CATEGORIES),
      hogar: getFeaturedByCategory(products, HOGAR_CATEGORIES),
    }),
    [products]
  );

  const currentProducts = tabProducts[activeTab];
  const showEmpty = currentProducts.length === 0;

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
    if (currentProducts.length <= 1) return;
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        scrollCarousel('right');
      }, 5000);
    }, 2000);
  }, [currentProducts.length, scrollCarousel]);

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

  function handleTabChange(tab: 'blanqueria' | 'hogar') {
    if (tab === activeTab) return;
    setAnimating(true);
    setActiveTab(tab);
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
    setTimeout(() => setAnimating(false), 400);
  }

  return (
    <section id={id} className={styles.section}>
      <div className={styles.wrapper}>
        <h2 className={styles.title}>Artículos más elegidos</h2>
        <p className={styles.subtitle}>Descubrí nuestros productos más destacados</p>

        <div className={styles.tabsContainer}>
          <button
            className={`${styles.tab} ${activeTab === 'blanqueria' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('blanqueria')}
          >
            🛏️ BLANQUERÍA
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'hogar' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('hogar')}
          >
            🏠 ARTÍCULOS DEL HOGAR
          </button>
        </div>

        <div className={`${styles.gridContainer} ${animating ? styles.fadeOut : styles.fadeIn}`}>
          {showEmpty ? (
            <div className={styles.emptyMessage}>
              <p>Próximamente</p>
              <p>Estamos agregando productos en esta categoría.</p>
            </div>
          ) : (
            <div className={styles.carouselWrapper}>
              <button className={styles.arrow} onClick={() => scrollCarousel('left')} aria-label="Anterior">
                ‹
              </button>
              <div
                className={styles.carousel}
                ref={carouselRef}
                onMouseEnter={stopAutoPlay}
                onMouseLeave={startAutoPlay}
              >
                {currentProducts.map((product, index) => {
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
              <button className={styles.arrow} onClick={() => scrollCarousel('right')} aria-label="Siguiente">
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
