'use client';

import Link from 'next/link';
import styles from '@/styles/Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerSection}>
          <h3>Contacto</h3>
          <ul>
            <li><Link href="tel:+5491158056418">+54 9 11-58056418</Link></li>
            <li><Link href="mailto:contacto@tusabanas.com">contacto@tusabanas.com</Link></li>
            <li><Link href="https://wa.me/5491158056418" target="_blank">💬 WhatsApp</Link></li>
          </ul>
        </div>

        <div className={styles.footerSection}>
          <h3>Métodos de Pago</h3>
          <p className={styles.paymentText}>
            Trabajamos con MercadoPago y efectivo.
          </p>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>Copyright © 2026 Tu Emprendimiento de Sábanas. Todos los derechos reservados.</p>
        <p style={{ marginTop: '0.5rem' }}>Defensa de consumidores | Botón de arrepentimiento</p>
      </div>
    </footer>
  );
}
