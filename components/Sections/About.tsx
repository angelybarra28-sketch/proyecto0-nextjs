'use client';

import Image from 'next/image';
import styles from '@/styles/About.module.css';
import { contactInfo } from '@/lib/config';

export default function About() {
  const handleWhatsApp = () => {
    window.open(`https://wa.me/${contactInfo.whatsapp}`, '_blank');
  };

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
        <button className={styles.ctaButton} onClick={handleWhatsApp}>
          <span className={styles.whatsappIcon}>
            <Image src="/logo/whatsapp-desktop.png" width={20} height={20} alt="WhatsApp" />
          </span>
          Contáctanos por WhatsApp
        </button>
      </div>
    </section>
  );
}
