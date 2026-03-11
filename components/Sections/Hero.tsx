'use client';

import styles from '@/styles/Hero.module.css';

export default function Hero() {
  const scrollToProducts = () => {
    const element = document.querySelector('[data-section="products"]');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <button className={styles.ctaButton} onClick={scrollToProducts}>
          Ver Productos
        </button>
      </div>
    </section>
  );
}
