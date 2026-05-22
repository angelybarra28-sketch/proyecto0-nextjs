'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/FloatingElements.module.css';

export default function FloatingElements() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isSpinnerVisible, setIsSpinnerVisible] = useState(false);

  useEffect(() => {
    let hideTimer: number | null = null;
    let spinnerShownAt: number | null = null;

    const handleScroll = () => {
      const aboutSection = document.querySelector('[class*="aboutContainer"]');
      if (aboutSection) {
        const rect = aboutSection.getBoundingClientRect();
        setShowBackToTop(rect.top < window.innerHeight);
      }
    };

    const hasPendingImages = () =>
      Array.from(document.images).some((img) => !img.complete);

    const clearHideTimer = () => {
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const scheduleHide = () => {
      clearHideTimer();
      hideTimer = window.setTimeout(() => {
        if (!hasPendingImages()) {
          setIsSpinnerVisible(false);
        } else {
          scheduleHide();
        }
      }, 1500);
    };

    const showSpinnerIfLoading = () => {
      if (hasPendingImages()) {
        setIsSpinnerVisible(true);
        spinnerShownAt = Date.now();
        scheduleHide();
      }
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(`.${styles.spinnerContainer}`) || target.closest(`.${styles.whatsappFloat}`)) {
        return;
      }

      const clickable = target.closest(
        'button, a, input, [role="button"], [role="link"], [type="button"], [type="submit"], [onclick]'
      );
      if (!clickable) return;

      window.setTimeout(showSpinnerIfLoading, 100);
    };

    const handleImageEvent = () => {
      if (!hasPendingImages()) {
        const elapsed = spinnerShownAt ? Date.now() - spinnerShownAt : 0;
        if (elapsed >= 1500) {
          setIsSpinnerVisible(false);
        } else {
          clearHideTimer();
          hideTimer = window.setTimeout(() => setIsSpinnerVisible(false), 1500 - elapsed);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('load', handleImageEvent, true);
    document.addEventListener('error', handleImageEvent, true);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('load', handleImageEvent, true);
      document.removeEventListener('error', handleImageEvent, true);
      clearHideTimer();
    };
  }, []);

  const scrollToBlanqueria = () => {
    const element = document.getElementById('blanqueria');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        <Image src="/logo/whatapp logo.png" alt="WhatsApp" width={42} height={42} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </Link>

      {/* BOTON VOLVER A PRODUCTOS (Aparece en sección About) */}
      <button 
        className={`${styles.backToTop} ${showBackToTop ? styles.visible : ''}`}
        onClick={scrollToBlanqueria}
        title="Volver a los artículos más elegidos"
      >
        <svg className={styles.svgIcon} viewBox="0 0 384 512">
          <path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"></path>
        </svg>
      </button>

      {/* SPINNER FLOTANTE */}
      {isSpinnerVisible && (
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
      )}
    </>
  );
}
