console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SITE URL:', process.env.NEXT_PUBLIC_SITE_URL);

import { Suspense } from 'react';
import Header from '@/components/Layout/Header';
import BannerCarousel from '@/components/Sections/BannerCarousel';
import Hero from '@/components/Sections/Hero';
import SearchBar from '@/components/SearchBar';
import ProductsSection from '@/components/Sections/ProductsSection';
import About from '@/components/Sections/About';
import Newsletter from '@/components/Sections/Newsletter';
import Footer from '@/components/Layout/Footer';
import FloatingElements from '@/components/FloatingElements';
import { getProductSections, getProducts } from '@/lib/services/catalogService';

export default async function Home() {
  const [productData, products] = await Promise.all([
    getProductSections(),
    getProducts(),
  ]);

  return (
    <>
      <Header />
      <BannerCarousel />
      <Hero />
      <Suspense fallback={<div style={{ backgroundColor: '#1e1d1b', height: '80px' }} />}>
        <SearchBar products={products} />
      </Suspense>
      <ProductsSection 
        title={productData.section1.title} 
        products={productData.section1.products}
        id="electrodomesticos"
      />
      <ProductsSection 
        title={productData.section2.title} 
        products={productData.section2.products}
        id="blanqueria"
      />
      <About />
      <Newsletter />
      <Footer />
      <FloatingElements />
    </>
  );
}
