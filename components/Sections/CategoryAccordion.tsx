'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { BLANQUERIA_CATEGORIES, HOGAR_CATEGORIES } from '@/lib/categoryGroups';
import type { Product } from '@/lib/types';
import styles from '@/styles/CategoryAccordion.module.css';

const ALL_CATEGORIES = [...BLANQUERIA_CATEGORIES, ...HOGAR_CATEGORIES];

interface CategoryAccordionProps {
  products: Product[];
}

export default function CategoryAccordion({ products }: CategoryAccordionProps) {
  const categories = useMemo(() => {
    const available = new Set(products.map((p) => p.categoria));
    const matched = ALL_CATEGORIES.filter((c) => available.has(c));
    products.forEach((p) => {
      if (p.categoria && !ALL_CATEGORIES.includes(p.categoria) && !matched.includes(p.categoria)) {
        matched.push(p.categoria);
      }
    });
    return matched;
  }, [products]);

  if (categories.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <h2 className={styles.title}>Categorías</h2>
        {categories.map((cat) => {
          const product = products.find((p) => p.categoria === cat && p.imageUrl);
          const imageUrl = product?.imageUrl;
          return (
            <Link
              key={cat}
              href={`/categoria/${encodeURIComponent(cat)}`}
              className={styles.categoryStrip}
              style={
                imageUrl
                  ? {
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${imageUrl})`,
                    }
                  : undefined
              }
            >
              <span className={styles.categoryName}>{cat}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
