'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import AOS from 'aos';
import 'aos/dist/aos.css';
import styles from '@/styles/BannerCarousel.module.css';

export default function BannerCarousel() {
  useEffect(() => {
    AOS.init({
      duration: 900,
      once: true,
      easing: 'ease-out-cubic',
    });
  }, []);

  return (
    <section className={styles.bannerCarousel}>
      <div className={styles.carouselContainer}>
        <div className={styles.carouselImage}>
          <Image
            src="/assets/fondo-hero.webp"
            alt="Fondo Principal"
            fill
            className={styles.image}
            priority
          />
        </div>

        {/* OFERTAS DESTACADAS */}
        <div className={styles.offersSection}>
          <div className={styles.offersContainer}>
            <div
              className={styles.offerCard}
              data-aos="zoom-in-right"
              data-aos-delay="100"
            >
              <h3>En 8 y 10 cuotas</h3>
              <p>mensuales o semanales, sin interés</p>
            </div>
            <div
              className={styles.offerCard}
              data-aos="zoom-in-left"
              data-aos-delay="250"
            >
              <h3>Envío a domicilio o punto de encuentro</h3>
              <p>Nos acercamos personalmente para que elijas el producto</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
