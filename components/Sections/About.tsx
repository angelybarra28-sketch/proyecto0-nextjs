'use client';

import styles from '@/styles/About.module.css';

export default function About() {
  return (
    <section className={styles.aboutSection}>
      <div className={styles.aboutContainer}>
        <h2>Sobre Nuestro Emprendimiento</h2>
        <p>
          Somos un emprendimiento dedicado a ofrecer los mejores productos de sábanas y artículos de cama
          con la más alta calidad y los mejores precios. Nos apasiona que disfrutes de la comodidad en tu hogar.
        </p>
        <p>
          Cada producto es cuidadosamente seleccionado y probado para garantizar que recibas exactamente
          lo que buscas: calidad, confort y estilo a tu alcance.
        </p>
        <button className={styles.ctaButton}>Contáctanos por WhatsApp</button>
      </div>
    </section>
  );
}
