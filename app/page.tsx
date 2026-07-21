console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SITE URL:', process.env.NEXT_PUBLIC_SITE_URL);

import { Suspense } from 'react';
import Header from '@/components/Layout/Header';
import BannerCarousel from '@/components/Sections/BannerCarousel';
import SearchBar from '@/components/SearchBar';
import ProductsSection from '@/components/Sections/ProductsSection';
import TabbedProductsSection from '@/components/Sections/TabbedProductsSection';
import CategoryAccordion from '@/components/Sections/CategoryAccordion';
import About from '@/components/Sections/About';
import Footer from '@/components/Layout/Footer';
import { getProductSections, getProducts } from '@/lib/services/catalogService';

export default async function Home() {
  const [productData, products] = await Promise.all([
    getProductSections(),
    getProducts(),
  ]);

  return (
    <>
      <Header products={products} />
      <BannerCarousel />
      <TabbedProductsSection products={products} id="productos-destacados" />
      <Suspense fallback={<div style={{ backgroundColor: '#1e1d1b', height: '80px' }} />}>
        <SearchBar products={products} />
      </Suspense>
      <CategoryAccordion products={products} />
      <ProductsSection
        title="Ofertas y Novedades"
        subtitle="Artículos del Hogar"
        products={productData.section2Hogar.products}
        id="ofertas-hogar"
      />
      <ProductsSection
        subtitle="Blanquería"
        products={productData.section2Blanqueria.products}
        id="ofertas-blanqueria"
      />
      <About />
      <Footer />
    </>
  );
}
