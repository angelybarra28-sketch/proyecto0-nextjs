'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cartContext';
import { useAuth } from '@/lib/authContext';
import styles from '@/styles/Header.module.css';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { items } = useCart();
  const { user, isAuthenticated, logout } = useAuth();

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
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.headerContainer}>
        {/* Botón Ingresar - Izquierda */}
        <div className={styles.authButtons}>
          {isAuthenticated ? (
            <>
              <span className={styles.userName}>Hola, {user?.nombreApellido}</span>
              <Link href="/admin" className={styles.adminLink}>
                Panel Admin
              </Link>
              <button onClick={logout} className={styles.logoutBtn}>
                Cerrar Sesión
              </button>
            </>
          ) : (
            <Link href="/auth" className={styles.loginBtn}>
              Ingresar
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
    </header>
  );
}
