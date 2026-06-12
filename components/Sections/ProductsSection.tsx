'use client';

import { useEffect, useState, useMemo } from 'react';
import ProductCard from '@/components/Product/ProductCard';
import { formatCurrency } from '@/components/Admin/shared/formatters';
import styles from '@/styles/ProductsSection.module.css';

interface Product {
  id: number;
  name: string;
  price: string;
  discount?: string;
  imageUrl?: string;
  slug: string;
}

interface LocalProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string;
  discountLabel?: string;
  categoryName?: string;
  status?: string;
  featured?: boolean;
  stock?: number;
  description?: string;
  carouselImages?: string[];
  installmentCount?: number;
  installmentAmount?: number;
}

interface ProductsSectionProps {
  title: string;
  products: Product[];
  id?: string;
  includeLocal?: boolean;
  categoryFilter?: string;
}

function adaptLocalProduct(lp: LocalProduct, idx: number): Product {
  return {
    id: idx + 1_000_000,
    name: lp.name,
    price: formatCurrency(lp.price),
    discount: lp.discountLabel || undefined,
    imageUrl: lp.imageUrl || undefined,
    slug: lp.slug,
  };
}

function readLocalProducts(): LocalProduct[] {
  try {
    const raw = localStorage.getItem('localProducts');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export default function ProductsSection({ title, products, id, includeLocal, categoryFilter }: ProductsSectionProps) {
  const [localItems, setLocalItems] = useState<LocalProduct[]>([]);

  useEffect(() => {
    if (!includeLocal) return;
    setLocalItems(readLocalProducts());
  }, [includeLocal]);

  const merged = useMemo(() => {
    if (!includeLocal || localItems.length === 0) return products;
    const filtered = categoryFilter
      ? localItems.filter(lp => lp.categoryName === categoryFilter)
      : localItems;
    const adapted = filtered.map(adaptLocalProduct);
    return [...products, ...adapted];
  }, [products, localItems, includeLocal, categoryFilter]);

  if (merged.length === 0) return null;

  return (
    <section id={id} className={styles.productsSection}>
      <div className={styles.productsWrapper}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div className={styles.productsGrid}>
          {merged.map((product, index) => (
            <ProductCard
              key={product.id}
              productId={product.id}
              name={product.name}
              price={product.price}
              discount={product.discount}
              imageUrl={product.imageUrl}
              productIndex={index}
              slug={product.slug}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
