'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from '@/styles/ProductDetail.module.css';

interface ProductCarouselProps {
  images: string[];
  productName: string;
}

export default function ProductCarousel({ images, productName }: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className={styles.carouselWrapper}>
      <div className={styles.mainImageContainer}>
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
  );
}
