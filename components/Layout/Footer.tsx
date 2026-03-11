'use client';

import Link from 'next/link';
import styles from '@/styles/Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerSection}>
          <h3>Navegación</h3>
          <ul>
            <li><Link href="#dormitorio">Dormitorio</Link></li>
            <li><Link href="#sabanas">Sábanas</Link></li>
            <li><Link href="#bano">Baño</Link></li>
            <li><Link href="#decoracion">Decoración</Link></li>
          </ul>
        </div>

        <div className={styles.footerSection}>
          <h3>Información</h3>
          <ul>
            <li><Link href="#">Cambios y Devoluciones</Link></li>
            <li><Link href="#">Envíos</Link></li>
            <li><Link href="#">Preguntas Frecuentes</Link></li>
            <li><Link href="#">Términos y Condiciones</Link></li>
          </ul>
        </div>

        <div className={styles.footerSection}>
          <h3>Contacto</h3>
          <ul>
            <li><Link href="tel:+5491128455650">+54 911 28455650</Link></li>
            <li><Link href="mailto:contacto@tusabanas.com">contacto@tusabanas.com</Link></li>
            <li><Link href="https://wa.me/5491128455650" target="_blank">💬 WhatsApp</Link></li>
          </ul>
          <div className={styles.socials}>
            <p>Síguenos</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href="#" style={{ color: '#d3cdc4', textDecoration: 'none' }}>📘 Instagram</Link>
              <Link href="#" style={{ color: '#d3cdc4', textDecoration: 'none' }}>📱 Facebook</Link>
            </div>
          </div>
        </div>

        <div className={styles.footerSection}>
          <h3>Métodos de Pago</h3>
          <p className={styles.paymentText}>
            Aceptamos todas las tarjetas de crédito y débito principales, transferencia bancaria y efectivo.
          </p>
          <div className={styles.paymentMethods}>
            <div className={styles.paymentIcon}>💳 VISA</div>
            <div className={styles.paymentIcon}>💳 MC</div>
            <div className={styles.paymentIcon}>💳 AMEX</div>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>Copyright © 2026 Tu Emprendimiento de Sábanas. Todos los derechos reservados.</p>
        <p style={{ marginTop: '0.5rem' }}>Defensa de consumidores | Botón de arrepentimiento</p>
      </div>
    </footer>
  );
}
