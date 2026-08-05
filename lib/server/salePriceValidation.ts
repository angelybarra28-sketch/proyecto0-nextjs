import type { SupabaseClient } from '@supabase/supabase-js';

export type PreSalePriceValidationMode = 'warn' | 'reject';

export type CatalogPriceByName = Map<string, number>;

export type PreSaleItemsValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const MAX_ITEM_QUANTITY = 999;
const MAX_PRICE = 1_000_000_000_000;
const MAX_NAME_LENGTH = 300;

export function getPreSalePriceValidationMode(): PreSalePriceValidationMode {
  return process.env.PRE_SALE_PRICE_VALIDATION?.trim().toLowerCase() === 'reject'
    ? 'reject'
    : 'warn';
}

export function normalizeCatalogName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function loadCatalogByName(
  supabase: SupabaseClient
): Promise<CatalogPriceByName> {
  const { listProducts } = await import('@/lib/repositories/productRepository');
  const products = await listProducts(supabase);
  const catalog = new Map<string, number>();
  for (const product of products) {
    catalog.set(normalizeCatalogName(product.name), Number(product.price));
  }
  return catalog;
}

export function validatePreSaleItems(
  items: Array<{ name?: unknown; price?: unknown; quantity?: unknown }>,
  catalogByName: CatalogPriceByName,
  mode: PreSalePriceValidationMode
): PreSaleItemsValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, errors: ['Missing required fields'], warnings };
  }

  items.forEach((item, index) => {
    const label = `item[${index}]`;

    if (typeof item?.name !== 'string' || item.name.trim().length === 0) {
      errors.push(`${label}: name is required`);
    } else if (item.name.trim().length > MAX_NAME_LENGTH) {
      errors.push(`${label}: name exceeds the allowed maximum length`);
    }

    const price = item?.price;
    const quantity = item?.quantity;

    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      errors.push(`${label}: price must be a positive number`);
    } else if (price > MAX_PRICE) {
      errors.push(`${label}: price exceeds the allowed maximum`);
    }

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
      errors.push(`${label}: quantity must be a positive integer`);
    } else if (quantity > MAX_ITEM_QUANTITY) {
      errors.push(`${label}: quantity exceeds the allowed maximum`);
    }

    if (typeof item?.name === 'string' && typeof price === 'number' && Number.isFinite(price)) {
      const normalizedName = normalizeCatalogName(item.name);
      const catalogPrice = catalogByName.get(normalizedName);

      if (catalogPrice === undefined) {
        warnings.push(`${label}: no catalog match for "${item.name.trim()}"`);
      } else if (Math.round(price * 100) !== Math.round(catalogPrice * 100)) {
        const message = `${label}: price mismatch (client ${price} vs catalog ${catalogPrice}) for "${item.name.trim()}"`;
        if (mode === 'reject') {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}
