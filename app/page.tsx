export const revalidate = 60;

import AOSInit from '@/components/AOSInit';
import Header from '@/components/Layout/Header';
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
      <AOSInit />
      <Header products={products} />
      <TabbedProductsSection products={products} id="productos-destacados" />
      <SearchBar products={products} />
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
