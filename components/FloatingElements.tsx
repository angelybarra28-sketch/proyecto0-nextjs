'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/FloatingElements.module.css';

export default function FloatingElements() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Mostrar el botón cuando llegamos cerca de la sección About (aprox 1400px o según scroll)
      // O usando el selector de aboutContainer si preferís precisión absoluta
      const aboutSection = document.querySelector('[class*="aboutContainer"]');
      if (aboutSection) {
        const rect = aboutSection.getBoundingClientRect();
        // Si la parte superior de "About" ya está en el viewport o más arriba
        setShowBackToTop(rect.top < window.innerHeight);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToMostChosen = () => {
    const element = document.getElementById('most-chosen');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* WHATSAPP FLOTANTE */}
      <Link
        href="https://wa.me/5491158056418"
        target="_blank"
        className={styles.whatsappFloat}
        title="Contáctanos por WhatsApp"
      >
        <img src="/logo/whatapp logo.png" alt="WhatsApp" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </Link>

      {/* BOTON VOLVER A PRODUCTOS (Aparece en sección About) */}
      <button 
        className={`${styles.backToTop} ${showBackToTop ? styles.visible : ''}`}
        onClick={scrollToMostChosen}
        title="Volver a los artículos más elegidos"
      >
        <svg className={styles.svgIcon} viewBox="0 0 384 512">
          <path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"></path>
        </svg>
      </button>

      {/* SPINNER FLOTANTE */}
      <div className={styles.spinnerContainer}>
        <div className={styles.spinner}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    </>
  );
}
