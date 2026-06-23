import Header from '@/components/Layout/Header';
import ProductsSection from '@/components/Sections/ProductsSection';
import Footer from '@/components/Layout/Footer';
import { getCatalogCategories, getProductsByCategory } from '@/lib/services/catalogService';
import Link from 'next/link';

interface Props {
  params: Promise<{
    categoria: string;
  }>;
}

export default async function CategoryPage({ params }: Props) {
  const { categoria } = await params;
  
  // Decodificar el slug de categoría en caso de espacios o caracteres especiales
  const decodedCategory = decodeURIComponent(categoria);
  
  // Filtrar productos por categoría usando el helper
  const products = await getProductsByCategory(decodedCategory);

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

        <ProductsSection 
          title={`Categoría: ${decodedCategory}`}
          products={products}
          id={categoria}
          includeLocal
        />
      </main>

      <Footer />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { categoria } = await params;
  const decodedCategory = decodeURIComponent(categoria);
  const products = await getProductsByCategory(decodedCategory);

  return {
    title: `Categoría: ${decodedCategory} | ElectroBlancos`,
    description: `Explora nuestros productos de la categoría ${decodedCategory}. ${products.length} productos disponibles.`
  };
}

export async function generateStaticParams() {
  const categories = await getCatalogCategories();
  return categories.map(category => ({
    categoria: category
  }));
}
