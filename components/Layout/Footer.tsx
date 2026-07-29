import styles from '@/styles/Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBottom}>
        <p>Copyright © 2026 Tu Emprendimiento de Sábanas. Todos los derechos reservados.</p>
        <p style={{ marginTop: '0.5rem' }}>Defensa de consumidores | Botón de arrepentimiento</p>
      </div>
    </footer>
  );
}
