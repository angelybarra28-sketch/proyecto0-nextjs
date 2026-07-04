'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAdminCategories, createAdminCategory, updateAdminCategory, deleteAdminCategory } from '@/lib/services/admin/client';
import type { AdminCategoryItem } from '@/lib/services/adminCategoryService';
import styles from '@/styles/Admin.module.css';

type FormState = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  sortOrder: 0,
  isActive: true,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 100);
}

function getCategoryPath(categoryId: string, categories: AdminCategoryItem[]): string {
  const parts: string[] = [];
  let current = categories.find(c => c.id === categoryId);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? categories.find(c => c.id === current!.parentId) : undefined;
  }
  return parts.join(' → ');
}

export function AdminCategoriesSection() {
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const payload = await fetchAdminCategories();
      setCategories(payload.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar categorías');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const madreCategories = categories.filter((c) => !c.parentId);
  const categoryCategories = categories.filter((c) => c.parentId && !categories.some((p) => p.parentId === c.id));
  const subcategoryCategories = categories.filter((c) => {
    if (!c.parentId) return false;
    const parent = categories.find((p) => p.id === c.parentId);
    return parent && parent.parentId !== null;
  });

  const getLevel = (cat: AdminCategoryItem): number => {
    if (!cat.parentId) return 1;
    const parent = categories.find(c => c.id === cat.parentId);
    if (!parent || !parent.parentId) return 2;
    return 3;
  };

  const getParentName = (cat: AdminCategoryItem): string => {
    if (!cat.parentId) return '—';
    const parent = categories.find(c => c.id === cat.parentId);
    return parent ? parent.name : '—';
  };

  const getGroupName = (cat: AdminCategoryItem): string => {
    if (!cat.parentId) return cat.name;
    let current = cat;
    while (current.parentId) {
      const parent = categories.find(c => c.id === current.parentId);
      if (!parent) break;
      current = parent;
    }
    return current.name;
  };

  const resetForm = () => {
    setForm(emptyForm);
    setShowCreateForm(false);
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      await createAdminCategory({
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || null,
        parentId: form.parentId || null,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      });
      setNotice('Categoría creada correctamente');
      resetForm();
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear categoría');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setIsSaving(true);
    setError('');
    try {
      await updateAdminCategory(editingId, {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || null,
        parentId: form.parentId || null,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      });
      setNotice('Categoría actualizada correctamente');
      resetForm();
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar categoría');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    setError('');
    try {
      await deleteAdminCategory(id);
      setNotice('Categoría eliminada correctamente');
      setDeleteConfirmId(null);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar categoría');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (cat: AdminCategoryItem) => {
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? '',
      parentId: cat.parentId ?? '',
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setEditingId(cat.id);
    setShowCreateForm(false);
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: editingId ? prev.slug : slugify(value),
    }));
  };

  const sortedCategories = [...categories].sort((a, b) => {
    const levelA = getLevel(a);
    const levelB = getLevel(b);
    if (levelA !== levelB) return levelA - levelB;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, 'es-AR');
  });

  return (
    <section className={styles.section}>
      <div className={styles.adminTableHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Categorías</h2>
          <p className={styles.adminTableSummary}>{categories.length} categoría(s) cargada(s)</p>
        </div>
        {!showCreateForm && !editingId && (
          <button
            className={styles.deleteBtn}
            onClick={() => setShowCreateForm(true)}
            disabled={isSaving}
          >
            + Nueva categoría
          </button>
        )}
      </div>

      {error && <p className={styles.adminAlertError}>{error}</p>}
      {notice && <p className={styles.adminAlertSuccess}>{notice}</p>}

      {(showCreateForm || editingId) && (
        <form onSubmit={editingId ? handleUpdate : handleCreate} style={{ marginBottom: '1.5rem' }}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td>Nombre</td>
                  <td>
                    <input
                      value={form.name}
                      disabled={isSaving}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      style={{ width: '100%' }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>Slug</td>
                  <td>
                    <input
                      value={form.slug}
                      disabled={isSaving}
                      onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                      required
                      style={{ width: '100%' }}
                    />
                    <small style={{ display: 'block', color: '#888', marginTop: '0.25rem' }}>
                      Se genera automáticamente desde el nombre.
                    </small>
                  </td>
                </tr>
                <tr>
                  <td>Descripción</td>
                  <td>
                    <textarea
                      value={form.description}
                      disabled={isSaving}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      style={{ width: '100%' }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>Categoría padre</td>
                  <td>
                    <select
                      value={form.parentId}
                      disabled={isSaving}
                      onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      <option value="">Ninguna (categoría raíz)</option>
                      {categories
                        .filter((c) => c.id !== editingId)
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {'  '.repeat(getLevel(cat) - 1)}{cat.name} ({getGroupName(cat)})
                          </option>
                        ))}
                    </select>
                    <small style={{ display: 'block', color: '#888', marginTop: '0.25rem' }}>
                      Si es una categoría principal, dejá "Ninguna". Si es una subcategoría, seleccioná su categoría padre.
                    </small>
                  </td>
                </tr>
                <tr>
                  <td>Orden</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.sortOrder}
                      disabled={isSaving}
                      onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
                      style={{ width: '80px' }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>Activo</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      disabled={isSaving}
                      onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className={styles.backLink} style={{ marginTop: '0.75rem' }}>
            <button className={styles.deleteBtn} type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear categoría'}
            </button>{' '}
            <button className={styles.deleteBtn} type="button" disabled={isSaving} onClick={resetForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className={styles.empty}>Cargando categorías...</p>
      ) : categories.length === 0 ? (
        <p className={styles.empty}>No hay categorías. Creá la primera.</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Slug</th>
                <th>Categoría padre</th>
                <th>Grupo madre</th>
                <th>Orden</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.map((cat) => {
                const level = getLevel(cat);
                return (
                  <tr key={cat.id} style={{ opacity: cat.isActive ? 1 : 0.5 }}>
                    <td>
                      <span style={{ marginLeft: `${(level - 1) * 20}px`, fontWeight: level === 1 ? 700 : 400 }}>
                        {level > 1 && '↳ '}{cat.name}
                      </span>
                      {level === 1 && (
                        <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#888' }}>
                          (madre)
                        </span>
                      )}
                    </td>
                    <td><code>{cat.slug}</code></td>
                    <td>{getParentName(cat)}</td>
                    <td>{getGroupName(cat)}</td>
                    <td>{cat.sortOrder}</td>
                    <td>{cat.isActive ? 'Sí' : 'No'}</td>
                    <td>
                      <div className={styles.adminRowActions}>
                        <button
                          className={styles.adminActionButton}
                          disabled={isSaving}
                          onClick={() => startEdit(cat)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.deleteBtn}
                          disabled={isSaving}
                          onClick={() => setDeleteConfirmId(cat.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            style={{
              background: '#1a1a2e',
              border: '1px solid #e74c3c',
              borderRadius: 8,
              padding: '1.5rem',
              maxWidth: 400,
              width: '90%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: '#e74c3c', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
              ¿Estás seguro que deseas eliminar esta categoría?
            </p>
            <p style={{ color: '#b8a89c', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {categories.find(c => c.id === deleteConfirmId)?.name}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className={styles.deleteBtn}
                onClick={() => void handleDelete(deleteConfirmId)}
              >
                Sí, eliminar
              </button>
              <button
                className={styles.adminActionButton}
                onClick={() => setDeleteConfirmId(null)}
              >
                No, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
