'use client';

import styles from '@/styles/Admin.module.css';

type BasicInfoProps = {
  name: string;
  slug: string;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onSlugManuallyEdit?: () => void;
};

export function BasicInfo({ name, slug, disabled, onNameChange, onSlugChange, onSlugManuallyEdit }: BasicInfoProps) {
  return (
    <>
      <tr>
        <td>Nombre</td>
        <td>
          <input
            value={name}
            disabled={disabled}
            onChange={(e) => onNameChange(e.target.value)}
            required
          />
        </td>
      </tr>
      <tr>
        <td>Slug</td>
        <td>
          <input
            value={slug}
            disabled={disabled}
            onChange={(e) => {
              onSlugChange(e.target.value);
              onSlugManuallyEdit?.();
            }}
            required
          />
        </td>
      </tr>
    </>
  );
}
