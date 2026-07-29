'use client';

import type { AdminProductPayload } from '@/lib/services/adminCatalogService';

type StatusProps = {
  status: AdminProductPayload['status'];
  disabled: boolean;
  isCreate: boolean;
  onChange: (value: AdminProductPayload['status']) => void;
};

const STATUS_OPTIONS_CREATE: { value: AdminProductPayload['status']; label: string }[] = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
  { value: 'OUT_OF_STOCK', label: 'Sin stock' },
  { value: 'ARCHIVED', label: 'Archivado' },
];

const STATUS_OPTIONS_EDIT: { value: AdminProductPayload['status']; label: string }[] = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
  { value: 'OUT_OF_STOCK', label: 'OUT_OF_STOCK' },
  { value: 'ARCHIVED', label: 'ARCHIVED' },
];

export function Status({ status, disabled, isCreate, onChange }: StatusProps) {
  const options = isCreate ? STATUS_OPTIONS_CREATE : STATUS_OPTIONS_EDIT;

  return (
    <>
      <tr>
        <td>{isCreate ? 'Estado' : 'Status'}</td>
        <td>
          <select
            value={status}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value as AdminProductPayload['status'])}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </td>
      </tr>
    </>
  );
}
