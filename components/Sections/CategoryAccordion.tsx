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

type MadreGroup = {
  id: string;
  name: string;
  slug: string;
  categories: (CatNode & { subcategories: CatNode[] })[];
};

const FALLBACK_CATEGORIES: CatNode[] = [
  { id: 'fb-1', name: 'Sábanas', slug: 'sabanas' },
  { id: 'fb-2', name: 'Acolchados', slug: 'acolchados' },
  { id: 'fb-3', name: 'Frazadas', slug: 'frazadas' },
  { id: 'fb-4', name: 'Almohadas', slug: 'almohadas' },
  { id: 'fb-5', name: 'Cubrecamas', slug: 'cubrecamas' },
  { id: 'fb-6', name: 'Toallones', slug: 'toallones' },
  { id: 'fb-7', name: 'Mantelería', slug: 'manteleria' },
  { id: 'fb-8', name: 'Cortinas', slug: 'cortinas' },
  { id: 'fb-9', name: 'Alfombras', slug: 'alfombras' },
  { id: 'fb-10', name: 'Batas', slug: 'batas' },
  { id: 'fb-11', name: 'Verano', slug: 'verano' },
  { id: 'fb-12', name: 'Invierno', slug: 'invierno' },
  { id: 'fb-13', name: 'Infantil', slug: 'infantil' },
  { id: 'fb-14', name: 'Cocina', slug: 'cocina' },
  { id: 'fb-15', name: 'Baño', slug: 'bano' },
  { id: 'fb-16', name: 'Colchas', slug: 'colchas' },
  { id: 'fb-17', name: 'Mantas', slug: 'mantas' },
  { id: 'fb-18', name: 'Ganchos', slug: 'ganchos' },
  { id: 'fb-19', name: 'Otros', slug: 'otros' },
];

interface CategoryAccordionProps {
  products: Product[];
}

export default function CategoryAccordion({ products }: CategoryAccordionProps) {
  const [madreGroups, setMadreGroups] = useState<MadreGroup[]>([]);

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

  const categories = useMemo(() => {
    const blanqueria = madreGroups.find((m) => m.slug === 'blanqueria');
    if (blanqueria && blanqueria.categories.length > 0) {
      return blanqueria.categories.map((c) => ({ name: c.name, slug: c.slug }));
    }
    return FALLBACK_CATEGORIES;
  }, [madreGroups]);

  if (categories.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <h2 className={styles.title}>Categorías</h2>
        {categories.map((cat) => {
          const product = products.find((p) => p.categoria === cat.name && p.imageUrl);
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
    </section>
  );
}
