'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import ProductCard from '@/components/Product/ProductCard';
import type { Product } from '@/lib/types';
import { BLANQUERIA_CATEGORIES, HOGAR_CATEGORIES } from '@/lib/categoryGroups';
import { normalizeCategory } from '@/lib/categoryUtils';
import styles from '@/styles/TabbedProductsSection.module.css';

interface TabbedProductsSectionProps {
  products: Product[];
  id?: string;
}

type TabKey = 'blanqueria' | 'hogar';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'blanqueria', label: 'Blanquería' },
  { key: 'hogar', label: 'Artículos del hogar' },
];

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
  const [activeTab, setActiveTab] = useState<TabKey>('blanqueria');
  const [animating, setAnimating] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const tabProducts = useMemo(
    () => ({
      blanqueria: getFeaturedByCategory(products, BLANQUERIA_CATEGORIES),
      hogar: getFeaturedByCategory(products, HOGAR_CATEGORIES),
    }),
    [products]
  );

  const currentProducts = tabProducts[activeTab];
  const showEmpty = currentProducts.length === 0;

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

  function handleTabChange(tab: TabKey) {
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

        <div className={styles.tabsContainer}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
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
              <div className={styles.carousel} ref={carouselRef}>
                {currentProducts.map((product, index) => (
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
          )}
        </div>
      </div>
    </section>
  );
}
