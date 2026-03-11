'use client';

import Link from 'next/link';
import styles from '@/styles/FloatingElements.module.css';

export default function FloatingElements() {
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
