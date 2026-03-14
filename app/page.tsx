import Header from '@/components/Layout/Header';
import BannerCarousel from '@/components/Sections/BannerCarousel';
import Hero from '@/components/Sections/Hero';
import ProductsSection from '@/components/Sections/ProductsSection';
import About from '@/components/Sections/About';
import Newsletter from '@/components/Sections/Newsletter';
import Footer from '@/components/Layout/Footer';
import FloatingElements from '@/components/FloatingElements';
import { productData } from '@/lib/products';

export default function Home() {
  return (
    <>
      <Header />
      <BannerCarousel />
      <Hero />
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
