export const revalidate = 60;

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
      <Header backUrl="/" />

      <main style={{ minHeight: '100vh', backgroundColor: '#1e1d1b' }}>
        {serverProduct ? (
          <div className={styles.detailContainer}>
            <div className={styles.detailGrid}>
              <div>
                <h1 className={styles.title}>{serverProduct.name}</h1>
                <ProductCarousel 
                  images={serverProduct.carouselImages || [serverProduct.imageUrl ?? '']} 
                  productName={serverProduct.name}
                />
              </div>
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
