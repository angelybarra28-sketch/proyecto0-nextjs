'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ProductCarousel from '@/components/Product/ProductCarousel';
import ProductInfo from '@/components/Product/ProductInfo';
import { formatCurrency } from '@/components/Admin/shared/formatters';
import styles from '@/styles/ProductDetail.module.css';

interface ServerProduct {
  id: number;
  name: string;
  price: string;
  discount?: string;
  imageUrl?: string;
  slug: string;
  description?: string;
  carouselImages?: string[];
  specifications?: {
    size: string;
    material: string;
    firmness: string;
    withPillow: string;
    color: string;
  };
  features?: string[];
}

interface LocalProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string;
  description?: string;
  carouselImages?: string[];
  discountLabel?: string;
}

interface ProductDetailClientProps {
  slug: string;
  serverProduct: ServerProduct | null;
}

function findLocalProduct(slug: string): ServerProduct | null {
  try {
    const raw = localStorage.getItem('localProducts');
    if (!raw) return null;
    const localProducts: LocalProduct[] = JSON.parse(raw);
    const found = localProducts.find(p => p.slug === slug);
    if (!found) return null;
    return {
      id: 1_000_000,
      name: found.name,
      price: formatCurrency(found.price),
      discount: found.discountLabel || undefined,
      imageUrl: found.imageUrl || undefined,
      slug: found.slug,
      description: found.description,
      carouselImages: found.carouselImages,
    };
  } catch {
    return null;
  }
}

export default function ProductDetailClient({ slug, serverProduct }: ProductDetailClientProps) {
  const [product, setProduct] = useState<ServerProduct | null>(serverProduct);
  const [checkedLocal, setCheckedLocal] = useState(!!serverProduct);

  useEffect(() => {
    if (checkedLocal) return;
    const local = findLocalProduct(slug);
    if (local) {
      setProduct(local);
    }
    setCheckedLocal(true);
  }, [slug, checkedLocal]);

  if (!product && !checkedLocal) {
    return <main style={{ minHeight: '100vh', backgroundColor: '#1e1d1b' }} />;
  }

  if (!product) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#1e1d1b', padding: '2rem', textAlign: 'center', color: '#b8a89c' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Producto no encontrado</h2>
        <Link href="/" style={{ color: '#b8a89c' }}>← Volver al catálogo</Link>
      </main>
    );
  }

  return (
    <div className={styles.detailContainer}>
      <div className={styles.detailGrid}>
        <ProductCarousel
          images={product.carouselImages || [product.imageUrl ?? '']}
          productName={product.name}
        />
        <ProductInfo
          productId={product.id}
          name={product.name}
          price={product.price}
          imageUrl={product.imageUrl ?? ''}
          discount={product.discount}
          description={product.description ?? ''}
          specifications={product.specifications ?? {
            size: 'N/A',
            material: 'N/A',
            firmness: 'N/A',
            withPillow: 'No',
            color: 'N/A',
          }}
          features={product.features ?? []}
        />
      </div>
    </div>
  );
}
