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
  size?: string;
  installmentCount?: number;
  installmentAmount?: number;
}

type CategoryFiltersProps = {
  title: string;
  id: string;
  products: FlatProduct[];
};

function normalizeSize(raw: string): string {
  return raw.replace(/\s*(?:plaza|plz|plazas)\s*/gi, '').trim();
}

function extractSizes(products: FlatProduct[]): string[] {
  const sizeSet = new Set<string>();
  for (const p of products) {
    if (p.size && p.size !== 'N/A') {
      const normalized = normalizeSize(p.size);
      if (normalized) {
        sizeSet.add(normalized);
        continue;
      }
    }
    const full = p.name.match(/(\d+\s+\d+\/\d+)(?:\s*(?:plaza|plz|plazas))?/i);
    if (full) {
      sizeSet.add(full[1].trim());
      continue;
    }
    const simple = p.name.match(/(\d+\/\d+)(?:\s*(?:plaza|plz|plazas))?/i);
    if (simple) {
      sizeSet.add(simple[1].trim());
      continue;
    }
    const word = p.name.match(/(queen|king|twin|full|double|single)/i);
    if (word) {
      sizeSet.add(word[0].toLowerCase());
    }
  }
  return [...sizeSet].sort();
}

function matchesSize(product: FlatProduct, size: string): boolean {
  if (product.size && product.size !== 'N/A') {
    return normalizeSize(product.size) === size;
  }
  return product.name.toLowerCase().includes(size);
}

export default function CategoryFilters({ title, id, products }: CategoryFiltersProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const sizes = useMemo(() => extractSizes(products), [products]);

  const filtered = useMemo(() => {
    if (!selectedSize) return products;
    return products.filter(p => matchesSize(p, selectedSize));
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
