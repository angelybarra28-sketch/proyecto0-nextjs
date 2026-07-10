'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import type { Product } from '@/lib/types';
import styles from '@/styles/CategoryAccordion.module.css';

type CatNode = {
  id: string;
  name: string;
  slug: string;
};

type CatWithDescIds = {
  name: string;
  slug: string;
  descendantIds: Set<string>;
};

type MadreGroup = {
  id: string;
  name: string;
  slug: string;
  categories: (CatNode & { subcategories: CatNode[] })[];
};

interface CategoryAccordionProps {
  products: Product[];
}

export default function CategoryAccordion({ products }: CategoryAccordionProps) {
  const [madreGroups, setMadreGroups] = useState<MadreGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'blanqueria' | 'articulos-del-hogar'>('blanqueria');

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.madreGroups) {
          setMadreGroups(data.madreGroups);
        }
      })
      .catch((err) => console.error('Error loading categories for accordion:', err));
  }, []);

  const categories = useMemo<CatWithDescIds[]>(() => {
    const group = madreGroups.find((m) => m.slug === activeTab);
    if (group && group.categories.length > 0) {
      return group.categories.map((c) => ({
        name: c.name,
        slug: c.slug,
        descendantIds: new Set([
          c.id,
          ...c.subcategories.map((s) => s.id),
        ]),
      }));
    }
    return [];
  }, [madreGroups, activeTab]);

  const hasProductsForTab = categories.length > 0;
  const hasAnyData = madreGroups.length > 0;

  if (!hasAnyData) return null;

  return (
    <section className={styles.section}>
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tab} ${activeTab === 'blanqueria' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('blanqueria')}
        >
          🛏️ BLANQUERÍA
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'articulos-del-hogar' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('articulos-del-hogar')}
        >
          🏠 ARTÍCULOS DEL HOGAR
        </button>
      </div>

      {hasProductsForTab ? (
        <div className={styles.card}>
          <h2 className={styles.title}>Categorías</h2>
          {categories.map((cat) => {
            const product = products.find((p) => p.imageUrl && p.categoryId && cat.descendantIds.has(p.categoryId));
            const imageUrl = product?.imageUrl;
            return (
              <Link
                key={cat.slug}
                href={`/categoria/${encodeURIComponent(cat.slug)}`}
                className={styles.categoryStrip}
                style={
                  imageUrl
                    ? {
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${imageUrl})`,
                      }
                    : undefined
                }
              >
                <span className={styles.categoryName}>{cat.name}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>Próximamente</p>
        </div>
      )}
    </section>
  );
}
