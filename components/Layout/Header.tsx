'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/Header.module.css';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.headerContainer}>
        <div className={styles.headerTop}>
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <img src="/logo/logo.png" alt="Logo" style={{ width: 'auto', maxHeight: '100%' }} />
            </div>
          </div>
        </div>

        <div className={styles.cartIcon}>🛒</div>

        <nav className={styles.headerNav}>
          <ul className={styles.mainNav}>
            <li className={styles.electrodomesticosItem}>
              <Link href="#electrodomesticos">Electrodomésticos y Artículos</Link>
              <ul className={styles.submenu}>
                <li><Link href="#tv">tv</Link></li>
                <li><Link href="#aire">aire</Link></li>
                <li><Link href="#cocina">artículos de cocina</Link></li>
                <li><Link href="#ventiladores">ventiladores</Link></li>
                <li><Link href="#biciletas">bicicletas</Link></li>
                <li><Link href="#consolas">consolas</Link></li>
                <li><Link href="#otros">otros</Link></li>
              </ul>
            </li>
            <li className={styles.blanqueriaItem}>
              <Link href="#blanqueria">Blanquería</Link>
              <ul className={styles.submenu}>
                <li><Link href="#sabanas">sábanas</Link></li>
                <li><Link href="#frazadas">frazadas</Link></li>
                <li><Link href="#cortinas">cortinas</Link></li>
                <li><Link href="#toallas">toallas</Link></li>
                <li><Link href="#otros">otros</Link></li>
              </ul>
            </li>
          </ul>
        </nav>

      </div>
    </header>
  );
}
