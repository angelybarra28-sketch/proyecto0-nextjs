'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from '@/styles/ProductDetail.module.css';

interface ProductCarouselProps {
  images: string[];
  productName: string;
}

export default function ProductCarousel({ images, productName }: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  const openLightbox = () => setLightboxOpen(true);
  const closeLightbox = () => setLightboxOpen(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!lightboxOpen) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
  }, [lightboxOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <div className={styles.carouselWrapper}>
        <div className={styles.mainImageContainer} onClick={openLightbox} style={{ cursor: 'pointer' }}>
          <Image
            src={images[currentIndex]}
            alt={`${productName} - imagen ${currentIndex + 1}`}
            fill
            className={styles.mainImage}
            priority
          />
        </div>

        {images.length > 1 && (
          <>
            <button 
              className={styles.carouselButton + ' ' + styles.prevButton}
              onClick={handlePrevious}
              aria-label="Imagen anterior"
            >
              ❮
            </button>

            <button 
              className={styles.carouselButton + ' ' + styles.nextButton}
              onClick={handleNext}
              aria-label="Siguiente imagen"
            >
              ❯
            </button>

            <div className={styles.dotsContainer}>
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
                  onClick={() => handleDotClick(index)}
                  aria-label={`Ver imagen ${index + 1}`}
                />
              ))}
              <span className={styles.pageInfo}>{currentIndex + 1}/{images.length}</span>
            </div>
          </>
        )}
      </div>

      {lightboxOpen && (
        <div className={styles.lightboxOverlay} onClick={closeLightbox}>
          <button
            className={styles.lightboxClose}
            onClick={closeLightbox}
            aria-label="Cerrar"
          >
            ✕
          </button>

          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <Image
              src={images[currentIndex]}
              alt={`${productName} - imagen ${currentIndex + 1}`}
              fill
              className={styles.lightboxImage}
              priority
            />
          </div>

          {images.length > 1 && (
            <>
              <button
                className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                aria-label="Imagen anterior"
              >
                ❮
              </button>
              <button
                className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                aria-label="Siguiente imagen"
              >
                ❯
              </button>
              <div className={styles.lightboxCounter}>
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
