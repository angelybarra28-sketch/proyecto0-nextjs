'use client';

import { useState, useRef, useEffect } from 'react';
import { useProductSearch } from '@/hooks/useProductSearch';
import ProductCard from '@/components/Product/ProductCard';
import type { Product } from '@/lib/types';
import styles from '@/styles/SearchBar.module.css';

interface SearchBarProps {
  placeholder?: string;
  products?: Product[];
}

export default function SearchBar({ placeholder = 'Buscar sábanas, acolchados, categoría...', products }: SearchBarProps) {
  const { query, setQuery, filteredProducts, clearSearch, totalResults, hasResults } = useProductSearch(products);
  const [isOpen, setIsOpen] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const PREVIEW_COUNT = 4;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setShowAllResults(false);
  }, [query]);

  function handleBlur() {
    if (query.trim() === '') {
      setIsOpen(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      if (query.trim() === '') {
        setIsOpen(false);
      } else {
        clearSearch();
      }
    }
  }

  function handleOpen() {
    setIsOpen(true);
  }

  const showResults = isOpen && query.trim() !== '';
  const displayProducts = showAllResults ? filteredProducts : filteredProducts.slice(0, PREVIEW_COUNT);
  const remainingCount = filteredProducts.length - PREVIEW_COUNT;

  return (
    <div className={styles.wrapper}>
      <div className={styles.inner} ref={containerRef}>
        {!isOpen ? (
          <button className={styles.lupaButton} onClick={handleOpen} title="Buscar productos">
            🔍
          </button>
        ) : (
          <div className={`${styles.inputContainer} ${isOpen ? styles.inputContainerExpanded : ''}`}>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={styles.input}
              />
              {query && (
                <button
                  onClick={clearSearch}
                  className={styles.clearButton}
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            {showResults && (
              <div className={styles.resultsContainer}>
                <h2 className={styles.resultsTitle}>
                  Resultados para &quot;{query}&quot; ({totalResults} {totalResults === 1 ? 'producto' : 'productos'})
                </h2>

                {hasResults ? (
                  <>
                    <div className={styles.resultsGrid}>
                      {displayProducts.map((product, index) => (
                        <ProductCard
                          key={product.id}
                          productId={product.id}
                          name={product.name}
                          price={product.price}
                          discount={product.discount}
                          imageUrl={product.imageUrl}
                          productIndex={index}
                          slug={product.slug}
                        />
                      ))}
                    </div>
                    {!showAllResults && remainingCount > 0 && (
                      <div className={styles.verTodosContainer}>
                        <button className={styles.verTodosButton} onClick={() => setShowAllResults(true)}>
                          VER TODOS ({remainingCount} {remainingCount === 1 ? 'producto' : 'productos'} más)
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.noResults}>
                    <p>No se encontraron productos</p>
                    <p>Prueba buscando otros términos como &quot;sábanas&quot;, &quot;acolchado&quot;, &quot;kit&quot; o &quot;polar&quot;.</p>
                  </div>
                )}

                <div className={styles.divider} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
