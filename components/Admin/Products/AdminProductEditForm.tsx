'use client';

import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { AdminCatalogCategory, AdminProductPayload } from '@/lib/services/adminCatalogService';
import { AdminProductForm } from './AdminProductForm';

type AdminProductEditFormProps = {
  product: AdminCatalogProduct;
  categories: AdminCatalogCategory[];
  isSaving: boolean;
  onSubmit: (productId: string, payload: AdminProductPayload) => Promise<void>;
  onCancel: () => void;
};

export function AdminProductEditForm({
  product,
  categories,
  isSaving,
  onSubmit,
  onCancel,
}: AdminProductEditFormProps) {
  return (
    <AdminProductForm
      mode="edit"
      product={product}
      categories={categories}
      isSaving={isSaving}
      onSubmit={(productId, payload) => onSubmit(productId!, payload)}
      onCancel={onCancel}
    />
  );
}
