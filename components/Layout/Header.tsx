'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cartContext';
import type { Product } from '@/lib/types';
import styles from '@/styles/Header.module.css';
import MobileMenu from '@/components/Layout/MobileMenu';

interface HeaderProps {
  products?: Product[];
  backUrl?: string;
}

export default function Header({ products, backUrl }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { items } = useCart();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const sentinel = document.createElement('div');
    sentinel.style.position = 'absolute';
    sentinel.style.top = '60px';
    sentinel.style.left = '0';
    sentinel.style.width = '1px';
    sentinel.style.height = '1px';
    sentinel.style.pointerEvents = 'none';
    document.body.prepend(sentinel);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''} ${menuOpen ? styles.headerMenuOpen : ''}`}>
      <div className={styles.headerContainer}>
        <div className={styles.leftGroup}>
          <button
            className={`${styles.burgerBtn} ${menuOpen ? styles.burgerBtnOpen : ''}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            <span />
            <span />
            <span />
          </button>
          {backUrl && (
            <Link href={backUrl} className={styles.backLink}>
              ← Volver al catálogo
            </Link>
          )}
        </div>

        {/* Logo - Centro */}
        <div className={styles.headerTop}>
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <Image src="/logo/logo.png" alt="Logo" width={180} height={90} style={{ width: 'auto', maxHeight: '100%' }} priority />
            </div>
          </div>
        </div>

        {/* Carrito - Derecha */}
        <Link href="/checkout" className={styles.cartIconLink}>
          <div className={styles.cartIcon}>
            <Image
              src="/icons/cart-icon.png"
              alt="Carrito"
              width={24}
              height={24}
            />
            {items.length > 0 && (
              <span className={styles.cartBadge}>{items.length}</span>
            )}
          </div>
        </Link>
      </div>

      <MobileMenu isOpen={menuOpen} onClose={closeMenu} products={products} />
    </header>
  );
}
