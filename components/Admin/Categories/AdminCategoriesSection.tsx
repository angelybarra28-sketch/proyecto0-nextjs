'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

type TreeNode = {
  category: AdminCategoryItem;
  children: TreeNode[];
  depth: number;
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
    const pid = current.parentId;
    current = pid ? categories.find(c => c.id === pid) : undefined;
  }
  return parts.join(' → ');
}

function buildTree(categories: AdminCategoryItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const cat of categories) {
    map.set(cat.id, { category: cat, children: [], depth: 0 });
  }

  for (const node of map.values()) {
    const pid = node.category.parentId;
    if (pid && map.has(pid)) {
      map.get(pid)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function assignDepth(nodes: TreeNode[], depth: number) {
    for (const node of nodes) {
      node.depth = depth;
      assignDepth(node.children, depth + 1);
    }
  }
  assignDepth(roots, 0);

  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.category.sortOrder !== b.category.sortOrder) return a.category.sortOrder - b.category.sortOrder;
      return a.category.name.localeCompare(b.category.name, 'es-AR');
    });
    for (const node of nodes) sortNodes(node.children);
  }
  sortNodes(roots);

  return roots;
}

function countDescendants(node: TreeNode): number {
  let count = 0;
  for (const child of node.children) {
    count += 1 + countDescendants(child);
  }
  return count;
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  const tree = useMemo(() => buildTree(categories), [categories]);

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

  useEffect(() => {
    if (categories.length > 0 && !initialized) {
      const rootIds = categories.filter(c => !c.parentId).map(c => c.id);
      setExpandedIds(new Set(rootIds));
      setInitialized(true);
    }
  }, [categories, initialized]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
    setForm(prev => ({
      ...prev,
      name: value,
      slug: editingId ? prev.slug : slugify(value),
    }));
  };

  const parentOptions = useMemo(() => {
    const options: { value: string; label: string; depth: number }[] = [];
    function walk(nodes: TreeNode[]) {
      for (const node of nodes) {
        if (node.category.id !== editingId) {
          options.push({
            value: node.category.id,
            label: getCategoryPath(node.category.id, categories),
            depth: node.depth,
          });
        }
        walk(node.children);
      }
    }
    walk(tree);
    return options;
  }, [tree, categories, editingId]);

  const selectedParentPath = form.parentId
    ? getCategoryPath(form.parentId, categories)
    : null;

  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    const isExpanded = expandedIds.has(node.category.id);
    const hasChildren = node.children.length > 0;
    const descendantCount = hasChildren ? countDescendants(node) : 0;

    return (
      <React.Fragment key={node.category.id}>
        <tr style={{ opacity: node.category.isActive ? 1 : 0.5 }}>
          <td>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: `${node.depth * 24}px` }}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(node.category.id)}
                  style={{ background: 'none', border: 'none', color: '#d3cdc4', cursor: 'pointer', padding: 0, fontSize: '0.65rem', width: 16, textAlign: 'center', flexShrink: 0 }}
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              ) : (
                <span style={{ width: 16, display: 'inline-block', flexShrink: 0 }} />
              )}
              <span style={{ fontWeight: node.depth === 0 ? 700 : 400 }}>
                {node.category.name}
              </span>
              {node.depth === 0 && (
                <span style={{ fontSize: '0.7rem', color: '#888', whiteSpace: 'nowrap' }}>
                  (madre)
                </span>
              )}
              {hasChildren && (
                <span style={{ fontSize: '0.7rem', color: '#666', whiteSpace: 'nowrap' }}>
                  — {descendantCount}
                </span>
              )}
            </div>
          </td>
          <td><code style={{ fontSize: '0.85rem' }}>{node.category.slug}</code></td>
          <td>{node.category.sortOrder}</td>
          <td>{node.category.isActive ? 'Sí' : 'No'}</td>
          <td>
            <div className={styles.adminRowActions}>
              <button className={styles.adminActionButton} disabled={isSaving} onClick={() => startEdit(node.category)}>
                Editar
              </button>
              <button className={styles.deleteBtn} disabled={isSaving} onClick={() => setDeleteConfirmId(node.category.id)}>
                Eliminar
              </button>
            </div>
          </td>
        </tr>
        {isExpanded && hasChildren && node.children.map(child => renderTreeNode(child))}
      </React.Fragment>
    );
  };

  return (
    <section className={styles.section}>
      <div className={styles.adminTableHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Categorías</h2>
          <p className={styles.adminTableSummary}>{categories.length} categoría(s) cargada(s)</p>
        </div>
        {!showCreateForm && !editingId && (
          <button className={styles.deleteBtn} onClick={() => setShowCreateForm(true)} disabled={isSaving}>
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
                    <input value={form.name} disabled={isSaving} onChange={(e) => handleNameChange(e.target.value)} required style={{ width: '100%' }} />
                  </td>
                </tr>
                <tr>
                  <td>Slug</td>
                  <td>
                    <input value={form.slug} disabled={isSaving} onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))} required style={{ width: '100%' }} />
                    <small style={{ display: 'block', color: '#888', marginTop: '0.25rem' }}>Se genera automáticamente desde el nombre.</small>
                  </td>
                </tr>
                <tr>
                  <td>Descripción</td>
                  <td>
                    <textarea value={form.description} disabled={isSaving} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} rows={2} style={{ width: '100%' }} />
                  </td>
                </tr>
                <tr>
                  <td>Categoría padre</td>
                  <td>
                    <select value={form.parentId} disabled={isSaving} onChange={(e) => setForm(prev => ({ ...prev, parentId: e.target.value }))} style={{ width: '100%' }}>
                      <option value="">Ninguna (categoría raíz)</option>
                      {parentOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {'  '.repeat(opt.depth)}{opt.label}
                        </option>
                      ))}
                    </select>
                    {selectedParentPath && (
                      <small style={{ display: 'block', color: '#aaa', marginTop: '0.25rem' }}>Ruta: {selectedParentPath}</small>
                    )}
                    <small style={{ display: 'block', color: '#888', marginTop: '0.25rem' }}>Si es una categoría principal, dejá &quot;Ninguna&quot;.</small>
                  </td>
                </tr>
                <tr>
                  <td>Orden</td>
                  <td>
                    <input type="number" min="0" step="1" value={form.sortOrder} disabled={isSaving} onChange={(e) => setForm(prev => ({ ...prev, sortOrder: Number(e.target.value) }))} style={{ width: '80px' }} />
                  </td>
                </tr>
                <tr>
                  <td>Activo</td>
                  <td>
                    <input type="checkbox" checked={form.isActive} disabled={isSaving} onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))} />
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
                <th>Orden</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tree.map(node => renderTreeNode(node))}
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
              <button className={styles.deleteBtn} onClick={() => void handleDelete(deleteConfirmId)}>
                Sí, eliminar
              </button>
              <button className={styles.adminActionButton} onClick={() => setDeleteConfirmId(null)}>
                No, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
