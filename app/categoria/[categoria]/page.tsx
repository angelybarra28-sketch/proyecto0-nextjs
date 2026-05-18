import Header from '@/components/Layout/Header';
import ProductsSection from '@/components/Sections/ProductsSection';
import Footer from '@/components/Layout/Footer';
import FloatingElements from '@/components/FloatingElements';
import { getProductsByCategory } from '@/lib/product-utils';
import { allProducts } from '@/lib/products';
import Link from 'next/link';

interface Props {
  params: Promise<{
    categoria: string;
  }>;
}

// Obtener todas las categorías únicas de los productos
function getAvailableCategories() {
  const categories = new Set(allProducts.map(p => p.categoria));
  return Array.from(categories);
}

export default async function CategoryPage({ params }: Props) {
  const { categoria } = await params;
  
  // Decodificar el slug de categoría en caso de espacios o caracteres especiales
  const decodedCategory = decodeURIComponent(categoria);
  
  // Filtrar productos por categoría usando el helper
  const products = getProductsByCategory(decodedCategory);

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

        {products.length > 0 ? (
          <ProductsSection 
            title={`Categoría: ${decodedCategory}`}
            products={products}
            id={categoria}
          />
        ) : (
          <div style={{
            maxWidth: '1200px',
            margin: '2rem auto',
            padding: '2rem',
            textAlign: 'center',
            color: '#b8a89c'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              Categoría no encontrada
            </h2>
            <p>No hay productos disponibles en la categoría "{decodedCategory}"</p>
          </div>
        )}
      </main>

      <Footer />
      <FloatingElements />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { categoria } = await params;
  const decodedCategory = decodeURIComponent(categoria);
  const products = getProductsByCategory(decodedCategory);

  return {
    title: `Categoría: ${decodedCategory} | ElectroBlancos`,
    description: `Explora nuestros productos de la categoría ${decodedCategory}. ${products.length} productos disponibles.`
  };
}

export async function generateStaticParams() {
  const categories = getAvailableCategories();
  return categories.map(category => ({
    categoria: category
  }));
}
