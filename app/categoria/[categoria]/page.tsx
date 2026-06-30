import Header from '@/components/Layout/Header';
import CategoryFilters from '@/components/Sections/CategoryFilters';
import Footer from '@/components/Layout/Footer';
import { getCatalogCategories, getProductsByCategory } from '@/lib/services/catalogService';
import { normalizeCategory, slugifyCategory } from '@/lib/categoryUtils';
import { PARENT_CATEGORIES } from '@/lib/categoryGroups';
import ParentCategoryGrid from '@/components/CategoryGrid/ParentCategoryGrid';
import Link from 'next/link';

interface Props {
  params: Promise<{
    categoria: string;
  }>;
}

export default async function CategoryPage({ params }: Props) {
  const { categoria } = await params;
  
  const decodedCategory = decodeURIComponent(categoria);
  const categoryForQuery = decodedCategory === 'invierno-abrigo'
    ? 'invierno/abrigo'
    : decodedCategory;

  const parentConfig = PARENT_CATEGORIES[categoryForQuery];

  if (parentConfig) {
    const subcategoryGroups = await Promise.all(
      parentConfig.subcategories.map(async (sub) => {
        const products = await getProductsByCategory(sub);
        return {
          name: sub,
          slug: slugifyCategory(sub),
          products: products.map(p => ({
            imageUrl: p.imageUrl ?? null,
            carouselImages: p.carouselImages ?? null,
            name: p.name,
            slug: p.slug,
          })),
        };
      })
    );

    return (
      <>
        <Header />
        <main style={{ minHeight: '100vh', backgroundColor: '#1e1d1b' }}>
          <div style={{
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
          <ParentCategoryGrid title={parentConfig.title} subcategories={subcategoryGroups} />
        </main>
        <Footer />
      </>
    );
  }

  const products = await getProductsByCategory(categoryForQuery);

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
          title={`Categoría: ${decodeURIComponent(categoria)}`}
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
  const categoryForQuery = decodedCategory === 'invierno-abrigo'
    ? 'invierno/abrigo'
    : decodedCategory;

  const parentConfig = PARENT_CATEGORIES[categoryForQuery];
  if (parentConfig) {
    return {
      title: `${parentConfig.title} | ElectroBlancos`,
      description: `Explora nuestra categoría ${parentConfig.title}. ${parentConfig.subcategories.length} subcategorías disponibles.`
    };
  }

  const products = await getProductsByCategory(categoryForQuery);
  return {
    title: `Categoría: ${decodedCategory} | ElectroBlancos`,
    description: `Explora nuestros productos de la categoría ${decodedCategory}. ${products.length} productos disponibles.`
  };
}

export async function generateStaticParams() {
  const categories = await getCatalogCategories();
  const normalized = categories.map(slug => slug === 'invierno/abrigo' ? 'invierno-abrigo' : slug);
  const parentSlugs = Object.keys(PARENT_CATEGORIES);
  const allSlugs = [...new Set([...normalized, ...parentSlugs])];
  return allSlugs.map(categoria => ({ categoria }));
}
