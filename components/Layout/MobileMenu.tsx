'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { useProductSearch } from '@/hooks/useProductSearch';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/Product/ProductCard';
import styles from '@/styles/MobileMenu.module.css';

type CatNode = {
  id: string;
  name: string;
  slug: string;
};

type CatWithDescIds = {
  name: string;
  slug: string;
  descendantIds: Set<string>;
};

type MadreGroup = {
  id: string;
  name: string;
  slug: string;
  categories: (CatNode & { subcategories: CatNode[] })[];
};

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
}

export default function MobileMenu({ isOpen, onClose, products }: MobileMenuProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [madreGroups, setMadreGroups] = useState<MadreGroup[]>([]);
  const [expandedMadre, setExpandedMadre] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedRecomendados, setExpandedRecomendados] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { query, setQuery, filteredProducts, clearSearch } = useProductSearch(products || []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error(`Expected JSON, got ${ct}`);
        return res.json();
      })
      .then((data) => {
        if (data.madreGroups) {
          setMadreGroups(data.madreGroups);
        }
      })
      .catch((err) => console.error('Error loading categories for mobile menu:', err));
  }, []);

  const recomendados = (products || []).filter((p) => p.destacado).slice(0, 6);

  const toggleMadre = useCallback((slug: string) => {
    setExpandedMadre((prev) => (prev === slug ? null : slug));
    setExpandedCat(null);
  }, []);

  const toggleCat = useCallback((slug: string) => {
    setExpandedCat((prev) => (prev === slug ? null : slug));
  }, []);

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={onClose}
      />
      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <Link href="/" className={styles.drawerLogoLink} onClick={onClose}>
            <Image src="/logo/logo.png" alt="Logo" width={80} height={40} className={styles.drawerLogo} />
          </Link>
        </div>

        <div className={styles.authSection}>
          {isAuthenticated ? (
            <div className={styles.authLogged}>
              <span className={styles.userName}>Hola, {user?.nombreApellido}</span>
              <div className={styles.authActions}>
                <Link href="/mi-cuenta" className={styles.adminLink} onClick={onClose}>
                  Mi Cuenta
                </Link>
                <Link href="/admin" className={styles.adminLink} onClick={onClose}>
                  Panel Admin
                </Link>
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className={styles.logoutBtn}
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.authGuest}>
              <Link href="/auth" className={styles.loginBtn} onClick={onClose}>
                Ingresar
              </Link>
              <Link href="/auth" className={styles.registerBtn} onClick={onClose}>
                Registrarse
              </Link>
            </div>
          )}
        </div>

        <div className={styles.menuContent}>
          <div className={styles.menuSection}>
            <h3 className={styles.sectionTitle}>Buscar</h3>
            <div className={styles.searchInputContainer}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Buscar productos..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSearchResults(e.target.value.trim() !== '');
                }}
              />
              {query && (
                <button
                  className={styles.searchClearButton}
                  onClick={() => {
                    clearSearch();
                    setShowSearchResults(false);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {showSearchResults && query.trim() !== '' && (
              <div className={styles.recomendadosGrid}>
                {filteredProducts.length > 0 ? (
                  filteredProducts.slice(0, 6).map((p) => (
                    <div key={p.id} onClick={onClose}>
                      <ProductCard
                        name={p.name}
                        price={p.price}
                        discount={p.discount}
                        imageUrl={p.imageUrl}
                        slug={p.slug}
                        productIndex={0}
                        productId={p.id}
                        installmentCount={p.installmentCount}
                        installmentAmount={p.installmentAmount}
                      />
                    </div>
                  ))
                ) : (
                  <p className={styles.noResults}>No se encontraron productos</p>
                )}
              </div>
            )}
          </div>

          {recomendados.length > 0 && (
            <div className={styles.menuSection}>
              <button
                className={styles.sectionTitle}
                onClick={() => setExpandedRecomendados((prev) => !prev)}
              >
                Recomendados
                <span className={`${styles.chevron} ${expandedRecomendados ? styles.chevronOpen : ''}`}>
                  ▾
                </span>
              </button>
              {expandedRecomendados && (
                <div className={styles.recomendadosGrid}>
                  {recomendados.map((p) => (
                    <ProductCard
                      key={p.id}
                      name={p.name}
                      price={p.price}
                      discount={p.discount}
                      imageUrl={p.imageUrl}
                      slug={p.slug}
                      productIndex={0}
                      productId={p.id}
                      installmentCount={p.installmentCount}
                      installmentAmount={p.installmentAmount}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={styles.menuSection}>
            <h3 className={styles.sectionTitle}>Categorías</h3>
            {madreGroups.map((madre) => (
              <div key={madre.id} className={styles.madreGroup}>
                <button
                  className={styles.madreToggle}
                  onClick={() => toggleMadre(madre.slug)}
                >
                  <span>{madre.name}</span>
                  <span className={`${styles.arrow} ${expandedMadre === madre.slug ? styles.arrowUp : ''}`}>
                    ▾
                  </span>
                </button>
                {expandedMadre === madre.slug && madre.categories.length > 0 && (
                  <ul className={styles.subList}>
                    {madre.categories.map((cat) => (
                      <li key={cat.slug}>
                        {cat.subcategories.length > 0 ? (
                          <>
                            <button
                              className={styles.catToggle}
                              onClick={() => toggleCat(cat.slug)}
                            >
                              <span>{cat.name}</span>
                              <span className={`${styles.catArrow} ${expandedCat === cat.slug ? styles.catArrowUp : ''}`}>
                                ▾
                              </span>
                            </button>
                            {expandedCat === cat.slug && (
                              <ul className={styles.nestedList}>
                                {cat.subcategories.map((sub) => (
                                  <li key={sub.slug}>
                                    <Link
                                      href={`/categoria/${encodeURIComponent(sub.slug)}`}
                                      className={styles.nestedLink}
                                      onClick={onClose}
                                    >
                                      {sub.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : (
                          <Link
                            href={`/categoria/${encodeURIComponent(cat.slug)}`}
                            className={styles.catToggle}
                            onClick={onClose}
                          >
                            <span>{cat.name}</span>
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
