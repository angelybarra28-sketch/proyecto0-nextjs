import Link from 'next/link';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import ProductCarousel from '@/components/Product/ProductCarousel';
import ProductInfo from '@/components/Product/ProductInfo';
import ProductDetailClient from '@/components/Product/ProductDetailClient';
import { getAllProductSlugs, getProductBySlug } from '@/lib/services/catalogService';
import styles from '@/styles/ProductDetail.module.css';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductDetailBySlugPage({ params }: Props) {
  const { slug } = await params;
  const serverProduct = await getProductBySlug(slug);

  return (
    <>
      <Header />

      <main style={{ minHeight: '100vh', backgroundColor: '#1e1d1b' }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '1rem 20px',
          borderBottom: '1px solid #363330'
        }}>
          <Link href="/" style={{ 
            color: '#b8a89c', 
            textDecoration: 'none',
            fontSize: '0.9rem'
          }}>
            ← Volver al catálogo
          </Link>
        </div>

        {serverProduct ? (
          <div className={styles.detailContainer}>
            <div className={styles.detailGrid}>
              <ProductCarousel 
                images={serverProduct.carouselImages || [serverProduct.imageUrl ?? '']} 
                productName={serverProduct.name}
              />
              <ProductInfo
                productId={serverProduct.id}
                name={serverProduct.name}
                price={serverProduct.price}
                imageUrl={serverProduct.imageUrl ?? ''}
                discount={serverProduct.discount}
                description={serverProduct.description ?? ''}
                installmentCount={serverProduct.installmentCount}
                installmentAmount={serverProduct.installmentAmount}
              />
            </div>
          </div>
        ) : (
          <ProductDetailClient slug={slug} serverProduct={null} />
        )}
      </main>

      <Footer />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Producto no encontrado',
      description: 'El producto que buscas no existe'
    };
  }

  return {
    title: `${product.name} | ElectroBlancos`,
    description: product.description ?? '',
    openGraph: {
      title: product.name,
      description: product.description ?? '',
      images: product.imageUrl ? [product.imageUrl] : []
    }
  };
}

export async function generateStaticParams() {
  return getAllProductSlugs();
}
