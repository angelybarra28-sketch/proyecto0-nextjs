'use client';

import { useProductSearch } from '@/hooks/useProductSearch';
import ProductCard from '@/components/Product/ProductCard';
import styles from '@/styles/ProductsSection.module.css';

interface SearchBarProps {
  placeholder?: string;
}

export default function SearchBar({ placeholder = 'Buscar sábanas, acolchados, categoría...' }: SearchBarProps) {
  const { query, setQuery, filteredProducts, clearSearch, totalResults, hasResults } = useProductSearch();

  return (
    <div style={{ backgroundColor: '#1e1d1b', padding: '1.5rem 20px 2.5rem 20px' }}>
      <div className={styles.productsWrapper}>
        {/* Contenedor del Input */}
        <div style={{
          position: 'relative',
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          {/* Icono de Lupa */}
          <span style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#b8a89c',
            fontSize: '1.1rem',
            pointerEvents: 'none',
          }}>
            🔍
          </span>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: '14px 45px 14px 45px',
              backgroundColor: '#262422',
              border: '1px solid #363330',
              borderRadius: '8px',
              color: '#f5f2ec',
              fontSize: '1rem',
              outline: 'none',
              transition: 'all 0.3s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#b8a89c';
              e.target.style.boxShadow = '0 0 12px rgba(184, 168, 156, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#363330';
              e.target.style.boxShadow = 'none';
            }}
          />

          {/* Botón de Limpieza (si hay query activa) */}
          {query && (
            <button
              onClick={clearSearch}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#b8a89c',
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '4px',
              }}
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sección de Resultados Activa */}
        {query.trim() !== '' && (
          <div style={{ marginTop: '2.5rem' }}>
            <h2 className={styles.sectionTitle} style={{ margin: '1rem 0 2rem 0', fontSize: '1.4rem', textAlign: 'left' }}>
              Resultados para "{query}" ({totalResults} {totalResults === 1 ? 'producto' : 'productos'})
            </h2>

            {hasResults ? (
              <div className={styles.productsGrid}>
                {filteredProducts.map((product, index) => (
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
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '3rem 20px',
                backgroundColor: '#262422',
                border: '1px solid #363330',
                borderRadius: '8px',
                color: '#b8a89c',
                marginTop: '1rem',
              }}>
                <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#f5f2ec' }}>
                  No se encontraron productos
                </p>
                <p style={{ fontSize: '0.9rem' }}>
                  Prueba buscando otros términos como "sábanas", "acolchado", "kit" o "polar".
                </p>
              </div>
            )}
            
            <div style={{
              borderBottom: '1px solid #363330',
              paddingTop: '2.5rem',
              marginBottom: '1rem',
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
