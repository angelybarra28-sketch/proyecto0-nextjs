'use client';

import { useState, useMemo } from 'react';
import ProductsSection from '@/components/Sections/ProductsSection';
import { normalizeSize, getSizeAliases } from '@/lib/sizeUtils';
import { normalizeCategory } from '@/lib/categoryUtils';

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

const DEFAULT_SIZES = ['queen', 'king'];

function extractSizes(products: FlatProduct[], categoryTitle: string, categoryId: string): string[] {
  const sizeSet = new Set<string>();

  const titleNormalized = categoryTitle.toLowerCase().includes('sabanas');
  const isWinterCategory = normalizeCategory(categoryTitle) === 'invierno/abrigo' || normalizeCategory(categoryId) === 'invierno/abrigo';
  if (titleNormalized || isWinterCategory) {
    DEFAULT_SIZES.forEach(s => sizeSet.add(s));
  }

  for (const p of products) {
    if (isWinterCategory) {
      const productSizes = getProductSizes(p);
      productSizes.forEach(s => sizeSet.add(s));
      continue;
    }
    if (p.size && p.size !== 'N/A') {
      const normalized = normalizeSize(p.size);
      if (normalized) {
        sizeSet.add(normalized);
        continue;
      }
    }
    const full = p.name.match(/(\d+\s+\d+\/\d+)(?:\s*(?:plaza|plz|plazas))?/i);
    if (full) {
      sizeSet.add(normalizeSize(full[1]));
      continue;
    }
    const simple = p.name.match(/(\d+\/\d+)(?:\s*(?:plaza|plz|plazas))?/i);
    if (simple) {
      sizeSet.add(normalizeSize(simple[1]));
      continue;
    }
    const word = p.name.match(/(queen|king|twin|full|double|single)/i);
    if (word) {
      sizeSet.add(normalizeSize(word[0]));
    }
  }
  return [...sizeSet].sort();
}

function getProductNormalizedSize(product: FlatProduct): string | null {
  if (product.size && product.size !== 'N/A') return normalizeSize(product.size);
  const full = product.name.match(/(\d+\s+\d+\/\d+)(?:\s*(?:plaza|plz|plazas))?/i);
  if (full) return normalizeSize(full[1]);
  const simple = product.name.match(/(\d+\/\d+)(?:\s*(?:plaza|plz|plazas))?/i);
  if (simple) return normalizeSize(simple[1]);
  const word = product.name.match(/(queen|king|twin|full|double|single)/i);
  if (word) return normalizeSize(word[0]);
  return null;
}

function parseSizeTokens(value: string): string[] {
  const tokens: string[] = [];
  let rest = value;

  const compound = rest.match(/\d+\s+\d+\/\d+/g);
  if (compound) {
    compound.forEach(c => {
      tokens.push(c);
      rest = rest.replace(c, '');
    });
  }

  const simple = rest.match(/\d+\/\d+/g);
  if (simple) {
    simple.forEach(s => {
      tokens.push(s);
      rest = rest.replace(s, '');
    });
  }

  const words = rest.match(/(queen|king|twin|full|double|single)/gi);
  if (words) {
    words.forEach(w => tokens.push(w.toLowerCase()));
  }

  return tokens;
}

function getProductSizes(product: FlatProduct): string[] {
  const sizes: string[] = [];

  if (product.size && product.size !== 'N/A') {
    const tokens = parseSizeTokens(product.size);
    tokens.forEach(t => {
      const normalized = normalizeSize(t);
      if (normalized && !sizes.includes(normalized)) sizes.push(normalized);
    });
  }

  if (sizes.length === 0) {
    const tokens = parseSizeTokens(product.name);
    tokens.forEach(t => {
      const normalized = normalizeSize(t);
      if (normalized && !sizes.includes(normalized)) sizes.push(normalized);
    });
  }

  return sizes;
}

function matchesSize(product: FlatProduct, size: string, isWinterCategory: boolean): boolean {
  if (isWinterCategory) {
    const productSizes = getProductSizes(product);
    if (productSizes.length === 0) return false;
    const aliases = getSizeAliases(size);
    return productSizes.some(ps => aliases.some(a => normalizeSize(a) === ps));
  }
  const productSize = getProductNormalizedSize(product);
  if (!productSize) return false;
  const aliases = getSizeAliases(size);
  return aliases.some(a => normalizeSize(a) === productSize);
}

export default function CategoryFilters({ title, id, products }: CategoryFiltersProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const sizes = useMemo(() => extractSizes(products, title, id), [products, title, id]);

  const isWinter = useMemo(() => normalizeCategory(id) === 'invierno/abrigo', [id]);

  const filtered = useMemo(() => {
    if (!selectedSize) return products;
    return products.filter(p => matchesSize(p, selectedSize, isWinter));
  }, [products, selectedSize, isWinter]);

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



