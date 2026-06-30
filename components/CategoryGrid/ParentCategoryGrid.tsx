'use client';

import SubcategoryCard from './SubcategoryCard';
import styles from '@/styles/ParentCategoryGrid.module.css';

interface SubcategoryProduct {
  imageUrl: string | null;
  carouselImages: string[] | null;
  name: string;
  slug: string;
}

interface SubcategoryGroup {
  name: string;
  slug: string;
  products: SubcategoryProduct[];
}

interface ParentCategoryGridProps {
  title: string;
  subcategories: SubcategoryGroup[];
}

export default function ParentCategoryGrid({ title, subcategories }: ParentCategoryGridProps) {
  const visible = subcategories.filter(s => s.products.length > 0);
  const empty = subcategories.filter(s => s.products.length === 0);

  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.grid}>
          {visible.map(sub => (
            <SubcategoryCard
              key={sub.slug}
              name={sub.name}
              slug={sub.slug}
              products={sub.products}
            />
          ))}
          {empty.map(sub => (
            <div key={sub.slug} className={styles.emptyCard}>
              <span className={styles.emptyLabel}>{sub.name}</span>
              <span className={styles.emptySub}>Próximamente</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
