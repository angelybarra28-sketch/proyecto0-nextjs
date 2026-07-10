'use client';

import styles from '@/styles/BannerCarousel.module.css';
import CategoryNavBar from '@/components/Layout/CategoryNavBar';

export default function BannerCarousel() {
  return (
    <section className={styles.bannerCarousel}>
      <div className={styles.categoryOverlay}>
        <CategoryNavBar floating />
      </div>
    </section>
  );
}
