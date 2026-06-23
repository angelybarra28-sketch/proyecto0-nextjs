'use client';

import styles from '@/styles/About.module.css';

export default function About() {
  return (
    <section className={styles.aboutSection}>
      <div className={styles.aboutContainer}>
        <h2>sobre nuestro emprendimiento</h2>
        <p>
          Somos una pyme familiar, dedicada hace mas de 50 años a la venta de blanqueria y electrodomesticos. 
          Cada producto es cuidadosamente seleccionado y probado para garantizar que recibas exactamente lo que buscas: calidad, confort y estilo a tu alcance.
        </p>
        <p>
          Trabajamos en cuotas fijas en pesos sin interes. No dudes en consultarnos, estaremos ahi para asesorarte de la mejor manera.
        </p>
        <button className={styles.ctaButton}>Contáctanos por WhatsApp</button>
      </div>
    </section>
  );
}
