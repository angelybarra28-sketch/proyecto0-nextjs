'use client';

import type { AdminCatalogCategory } from '@/lib/services/adminCatalogService';

type CategoriesProps = {
  categories: AdminCatalogCategory[];
  cascadeMadre: string;
  cascadeChild: string;
  cascadeGrandchild: string;
  cascadeMadre2: string;
  cascadeChild2: string;
  cascadeGrandchild2: string;
  showSecondCascade: boolean;
  madreCategories: AdminCatalogCategory[];
  childCategories: AdminCatalogCategory[];
  grandchildCategories: AdminCatalogCategory[];
  childCats2: AdminCatalogCategory[];
  grandchildCats2: AdminCatalogCategory[];
  resolvedPrimary: string | null;
  resolvedSecondary: string | null;
  disabled: boolean;
  isCreate: boolean;
  onCascadeMadre: (value: string) => void;
  onCascadeChild: (value: string) => void;
  onCascadeGrandchild: (value: string) => void;
  onCascadeMadre2: (value: string) => void;
  onCascadeChild2: (value: string) => void;
  onCascadeGrandchild2: (value: string) => void;
  onToggleSecondCascade: () => void;
};

export function Categories({
  categories,
  cascadeMadre,
  cascadeChild,
  cascadeGrandchild,
  cascadeMadre2,
  cascadeChild2,
  cascadeGrandchild2,
  showSecondCascade,
  madreCategories,
  childCategories,
  grandchildCategories,
  childCats2,
  grandchildCats2,
  resolvedPrimary,
  resolvedSecondary,
  disabled,
  isCreate,
  onCascadeMadre,
  onCascadeChild,
  onCascadeGrandchild,
  onCascadeMadre2,
  onCascadeChild2,
  onCascadeGrandchild2,
  onToggleSecondCascade,
}: CategoriesProps) {
  const s = isCreate
    ? { gap: '0.5rem', mb: '0.25rem', mt: '0.25rem', btnP: '0.5rem', btnMt: '0.25rem', hrM: '0.25rem 0', rmBtnP: '0.4rem' }
    : { gap: '0.25rem', mb: '0.1rem', mt: '0.1rem', btnP: '0.3rem', btnMt: '0.1rem', hrM: '0.15rem 0', rmBtnP: '0.25rem' };

  return (
    <tr>
      <td style={{ verticalAlign: 'top' }}>Categorías</td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.gap }}>
          <div>
            <label style={{ display: 'block', marginBottom: s.mb, color: '#b8a89c', fontSize: '0.85rem' }}>
              Categoría principal
            </label>
            <select
              value={cascadeMadre}
              disabled={disabled}
              onChange={(e) => onCascadeMadre(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">— Seleccionar —</option>
              {madreCategories.map((madre) => (
                <option key={madre.id} value={madre.id}>{madre.name}</option>
              ))}
            </select>
          </div>
          {childCategories.length > 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: s.mb, color: '#b8a89c', fontSize: '0.85rem' }}>
                Subcategoría
              </label>
              <select
                value={cascadeChild}
                disabled={disabled}
                onChange={(e) => onCascadeChild(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">— Ninguna (solo categoría principal) —</option>
                {childCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}
          {grandchildCategories.length > 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: s.mb, color: '#b8a89c', fontSize: '0.85rem' }}>
                Subcategoría específica
              </label>
              <select
                value={cascadeGrandchild}
                disabled={disabled}
                onChange={(e) => onCascadeGrandchild(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">— Ninguna —</option>
                {grandchildCategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}
          {resolvedPrimary && (
            <div style={{ fontSize: '0.85rem', color: '#c8a87c', marginTop: s.mt }}>
              ✓ Seleccionado: {categories.find(c => c.id === resolvedPrimary)?.name ?? resolvedPrimary}
            </div>
          )}

          {!showSecondCascade && (
            <button
              type="button"
              disabled={disabled}
              onClick={onToggleSecondCascade}
              style={{
                background: 'none',
                border: '1px dashed #b8a89c',
                borderRadius: '4px',
                padding: s.btnP,
                cursor: 'pointer',
                color: '#b8a89c',
                fontSize: '0.85rem',
                marginTop: s.btnMt,
              }}
            >
              + Agregar otra categoría
            </button>
          )}

          {showSecondCascade && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid #333', margin: s.hrM }} />
              <div>
                <label style={{ display: 'block', marginBottom: s.mb, color: '#b8a89c', fontSize: '0.85rem' }}>
                  Categoría secundaria (opcional)
                </label>
                <select
                  value={cascadeMadre2}
                  disabled={disabled}
                  onChange={(e) => onCascadeMadre2(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">— Seleccionar —</option>
                  {madreCategories.map((madre) => (
                    <option key={madre.id} value={madre.id}>{madre.name}</option>
                  ))}
                </select>
              </div>
              {childCats2.length > 0 && (
                <div>
                  <label style={{ display: 'block', marginBottom: s.mb, color: '#b8a89c', fontSize: '0.85rem' }}>
                    Subcategoría
                  </label>
                  <select
                    value={cascadeChild2}
                    disabled={disabled}
                    onChange={(e) => onCascadeChild2(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">— Ninguna (solo categoría principal) —</option>
                    {childCats2.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {grandchildCats2.length > 0 && (
                <div>
                  <label style={{ display: 'block', marginBottom: s.mb, color: '#b8a89c', fontSize: '0.85rem' }}>
                    Subcategoría específica
                  </label>
                  <select
                    value={cascadeGrandchild2}
                    disabled={disabled}
                    onChange={(e) => onCascadeGrandchild2(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">— Ninguna —</option>
                    {grandchildCats2.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {resolvedSecondary && (
                <div style={{ fontSize: '0.85rem', color: '#c8a87c', marginTop: s.mt }}>
                  ✓ Seleccionado: {categories.find(c => c.id === resolvedSecondary)?.name ?? resolvedSecondary}
                </div>
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={onToggleSecondCascade}
                style={{
                  background: 'none',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  padding: s.rmBtnP,
                  cursor: 'pointer',
                  color: '#e07070',
                  fontSize: '0.85rem',
                  marginTop: s.btnMt,
                }}
              >
                − Quitar categoría secundaria
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
