import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import FloatingElements from '@/components/FloatingElements';
import ProductCarousel from '@/components/Product/ProductCarousel';
import ProductInfo from '@/components/Product/ProductInfo';
import { allProducts } from '@/lib/products';
import styles from '@/styles/ProductDetail.module.css';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = allProducts.find(p => p.id === parseInt(id));

  if (!product) {
    notFound();
  }

  return (
    <>
      <Header />

      <main style={{ minHeight: '100vh', backgroundColor: '#1e1d1b' }}>
        {/* Breadcrumb */}
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

        {/* Product Detail */}
        <div className={styles.detailContainer}>
          <div className={styles.detailGrid}>
            {/* Left: Carousel */}
            <ProductCarousel 
              images={product.carouselImages || [product.imageUrl]} 
              productName={product.name}
            />

            {/* Right: Info */}
            <ProductInfo
              productId={product.id}
              name={product.name}
              price={product.price}
              discount={product.discount}
              description={product.description}
              specifications={product.specifications}
              features={product.features}
            />
          </div>
        </div>
      </main>

      <Footer />
      <FloatingElements />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = allProducts.find(p => p.id === parseInt(id));

  if (!product) {
    return {
      title: 'Producto no encontrado',
      description: 'El producto que buscas no existe'
    };
  }

  return {
    title: `${product.name} | ElectroBlancos`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.imageUrl]
    }
  };
}

export async function generateStaticParams() {
  return allProducts.map(product => ({
    id: product.id.toString()
  }));
}
