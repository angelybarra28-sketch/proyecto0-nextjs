import Header from '@/components/Layout/Header';
import CategoryFilters from '@/components/Sections/CategoryFilters';
import Footer from '@/components/Layout/Footer';
import { getCatalogCategories, getProductsByCategory } from '@/lib/services/catalogService';
import { slugifyCategory, normalizeCategory } from '@/lib/categoryUtils';
import { listActiveCategories } from '@/lib/repositories/categoryRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { PARENT_CATEGORIES } from '@/lib/categoryGroups';
import ParentCategoryGrid from '@/components/CategoryGrid/ParentCategoryGrid';
import type { CatalogCategoryRow } from '@/lib/adapters/catalogAdapter';

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
        <Header backUrl="/" />
        <main style={{ minHeight: '100vh', backgroundColor: '#1e1d1b' }}>
          <ParentCategoryGrid title={parentConfig.title} subcategories={subcategoryGroups} />
        </main>
        <Footer />
      </>
    );
  }

  const products = await getProductsByCategory(categoryForQuery);

  let subcategories: CatalogCategoryRow[] = [];
  let categoryName: string | null = null;
  try {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      const allCats = await listActiveCategories(supabase);
      const normalizedInput = normalizeCategory(categoryForQuery);
      const slugTarget = allCats.find(
        c => normalizeCategory(c.slug ?? '') === normalizedInput
      );
      const target = slugTarget ?? allCats.find(
        c => normalizeCategory(c.name) === normalizedInput
      );
      if (target) {
        subcategories = allCats.filter(c => c.parent_id === target.id);
        categoryName = target.name;
      }
    }
  } catch {
    // silencioso
  }

  const adapted = products.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    discount: p.discount || undefined,
    imageUrl: p.imageUrl || undefined,
    slug: p.slug,
    size: p.specifications?.size,
    categoryName: p.category,
    categoryNames: p.categoryNames,
    installmentCount: p.installmentCount,
    installmentAmount: p.installmentAmount,
  }));

  return (
    <>
      <Header backUrl="/" />

      <main style={{ minHeight: '100vh', backgroundColor: '#1e1d1b' }}>
        <CategoryFilters
          title={categoryName ?? decodeURIComponent(categoria)}
          id={categoria}
          products={adapted}
          subcategories={subcategories}
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
  let categoryName: string | null = null;
  try {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      const allCats = await listActiveCategories(supabase);
      const normalizedInput = normalizeCategory(categoryForQuery);
      const slugTarget = allCats.find(
        c => normalizeCategory(c.slug ?? '') === normalizedInput
      );
      const target = slugTarget ?? allCats.find(
        c => normalizeCategory(c.name) === normalizedInput
      );
      if (target) {
        categoryName = target.name;
      }
    }
  } catch {
    // silencioso
  }
  return {
    title: `${categoryName ?? decodedCategory} | ElectroBlancos`,
    description: `Explora nuestros productos de la categoría ${categoryName ?? decodedCategory}. ${products.length} productos disponibles.`
  };
}

export async function generateStaticParams() {
  const categories = await getCatalogCategories();
  const normalized = categories.map(slug => slug === 'invierno/abrigo' ? 'invierno-abrigo' : slug);
  const parentSlugs = Object.keys(PARENT_CATEGORIES);
  const allSlugs = [...new Set([...normalized, ...parentSlugs])];
  return allSlugs.map(categoria => ({ categoria }));
}
