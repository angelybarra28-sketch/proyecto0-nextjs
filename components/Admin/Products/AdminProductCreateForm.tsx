'use client';

import type { AdminCatalogCategory, AdminProductPayload } from '@/lib/services/adminCatalogService';
import { AdminProductForm } from './AdminProductForm';

type AdminProductCreateFormProps = {
  categories: AdminCatalogCategory[];
  isSaving: boolean;
  onSubmit: (payload: AdminProductPayload) => Promise<void>;
  onCancel: () => void;
};

export function AdminProductCreateForm({
  categories,
  isSaving,
  onSubmit,
  onCancel,
}: AdminProductCreateFormProps) {
  return (
    <AdminProductForm
      mode="create"
      categories={categories}
      isSaving={isSaving}
      onSubmit={(_productId, payload) => onSubmit(payload)}
      onCancel={onCancel}
    />
  );
}
