'use client';

import { useState, useMemo } from 'react';
import ProductsSection from '@/components/Sections/ProductsSection';

interface FlatProduct {
  id: number;
  name: string;
  price: string;
  discount?: string;
  imageUrl?: string;
  slug: string;
}

type CategoryFiltersProps = {
  title: string;
  id: string;
  products: FlatProduct[];
};

function extractSizes(names: string[]): string[] {
  const sizeSet = new Set<string>();
  const patterns = [
    /(\d+\s*\d*\/?\d*)\s*(plaza|plz|plazas)/gi,
    /(queen|king|twin|full|double|single)/gi,
    /\b(\d+\/\d+)\b/g,
  ];
  for (const name of names) {
    for (const pattern of patterns) {
      const matches = name.matchAll(pattern);
      for (const m of matches) {
        sizeSet.add(m[0].trim().toLowerCase());
      }
    }
  }
  return [...sizeSet].sort();
}

function matchesSize(name: string, size: string): boolean {
  return name.toLowerCase().includes(size);
}

export default function CategoryFilters({ title, id, products }: CategoryFiltersProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const sizes = useMemo(() => extractSizes(products.map(p => p.name)), [products]);

  const filtered = useMemo(() => {
    if (!selectedSize) return products;
    return products.filter(p => matchesSize(p.name, selectedSize));
  }, [products, selectedSize]);

  return (
    <div>
      {sizes.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          padding: '0.75rem 20px',
          maxWidth: 1200,
          margin: '0 auto',
          marginBottom: '0.5rem',
        }}>
          <button
            onClick={() => setSelectedSize(null)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 6,
              border: selectedSize === null ? '1px solid #c8a87c' : '1px solid #363330',
              background: selectedSize === null ? '#c8a87c' : '#2a2826',
              color: selectedSize === null ? '#1a1a1a' : '#b8a89c',
              cursor: 'pointer',
              fontWeight: selectedSize === null ? 700 : 400,
              fontSize: '0.85rem',
            }}
          >
            Todos
          </button>
          {sizes.map(size => (
            <button
              key={size}
              onClick={() => setSelectedSize(size === selectedSize ? null : size)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 6,
                border: size === selectedSize ? '1px solid #c8a87c' : '1px solid #363330',
                background: size === selectedSize ? '#c8a87c' : '#2a2826',
                color: size === selectedSize ? '#1a1a1a' : '#b8a89c',
                cursor: 'pointer',
                fontWeight: size === selectedSize ? 700 : 400,
                fontSize: '0.85rem',
                textTransform: 'capitalize',
              }}
            >
              {size}
            </button>
          ))}
        </div>
      )}
      <ProductsSection
        title={`${title}${selectedSize ? ` - ${selectedSize}` : ''} (${filtered.length} producto(s))`}
        products={filtered}
        id={id}
      />
    </div>
  );
}
