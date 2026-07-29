'use client';

import { ProductUrlImporter, type ImportedProductData } from '@/components/Admin/Products/ProductUrlImporter';

type CreateExtrasProps = {
  onImport: (data: ImportedProductData) => void;
};

export function CreateExtras({ onImport }: CreateExtrasProps) {
  return <ProductUrlImporter onImport={onImport} />;
}
