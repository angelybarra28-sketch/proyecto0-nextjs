'use client';

import ProductCard from '@/components/Product/ProductCard';
import styles from '@/styles/ProductsSection.module.css';

interface Product {
  id: number;
  name: string;
  price: string;
  discount?: string;
  imageUrl?: string;
}

interface ProductsSectionProps {
  title: string;
  products: Product[];
  id?: string;
}

export default function ProductsSection({ title, products, id }: ProductsSectionProps) {
  return (
    <section id={id} className={styles.productsSection}>
      <div className={styles.productsWrapper}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div className={styles.productsGrid}>
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              name={product.name}
              price={product.price}
              discount={product.discount}
              imageUrl={product.imageUrl}
              productIndex={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
