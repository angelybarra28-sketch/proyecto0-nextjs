'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import AOS from 'aos';
import 'aos/dist/aos.css';
import styles from '@/styles/BannerCarousel.module.css';

const bannerImages = [
  '/assets/sabana 1.webp',
  '/assets/sabana 2.webp',
  '/assets/sabana 3.webp'
];

export default function BannerCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 900,
      once: true,
      easing: 'ease-out-cubic',
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeOut(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % bannerImages.length);
        setFadeOut(false);
      }, 400);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index: number) => {
    setFadeOut(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setFadeOut(false);
    }, 400);
  };

  return (
    <section className={styles.bannerCarousel}>
      <div className={styles.carouselContainer}>
        <div className={`${styles.carouselImage} ${fadeOut ? styles.fadeOut : ''}`}>
          <Image
            src={bannerImages[currentSlide]}
            alt={`Banner ${currentSlide + 1}`}
            fill
            className={styles.image}
            priority
          />
        </div>

        <div className={styles.carouselControls}>
          {bannerImages.map((_, index) => (
            <button
              key={index}
              className={`${styles.carouselDot} ${index === currentSlide ? styles.active : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
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
