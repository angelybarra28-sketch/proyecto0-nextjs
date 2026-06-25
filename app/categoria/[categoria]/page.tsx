import Header from '@/components/Layout/Header';
import CategoryFilters from '@/components/Sections/CategoryFilters';
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
  
  const decodedCategory = decodeURIComponent(categoria);
  
  const products = await getProductsByCategory(decodedCategory);

  const adapted = products.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    discount: p.discount || undefined,
    imageUrl: p.imageUrl || undefined,
    slug: p.slug,
    size: p.specifications?.size,
    installmentCount: p.installmentCount,
    installmentAmount: p.installmentAmount,
  }));

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

        <CategoryFilters
          title={`Categoría: ${decodedCategory}`}
          id={categoria}
          products={adapted}
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
