'use client';

import { useState } from 'react';
import type { AdminCatalogCategory } from '@/lib/services/adminCatalogService';

function resolveCascade(
  categoryId: string | null | undefined,
  categories: AdminCatalogCategory[]
): { cascadeMadre: string; cascadeChild: string; cascadeGrandchild: string } {
  if (!categoryId) return { cascadeMadre: '', cascadeChild: '', cascadeGrandchild: '' };
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return { cascadeMadre: '', cascadeChild: '', cascadeGrandchild: '' };
  if (!cat.parentId) return { cascadeMadre: cat.id, cascadeChild: '', cascadeGrandchild: '' };
  const parent = categories.find(c => c.id === cat.parentId);
  if (!parent || !parent.parentId) {
    return { cascadeMadre: parent?.id ?? cat.parentId, cascadeChild: cat.id, cascadeGrandchild: '' };
  }
  return { cascadeMadre: parent.parentId, cascadeChild: parent.id, cascadeGrandchild: cat.id };
}

function initFromCategoryIds(
  categoryIds: string[] | undefined | null,
  categories: AdminCatalogCategory[]
) {
  const firstCatId = categoryIds?.[0];
  const first = resolveCascade(firstCatId, categories);
  const secondCatId = categoryIds?.[1];
  const second = resolveCascade(secondCatId, categories);
  return {
    cascadeMadre: first.cascadeMadre,
    cascadeChild: first.cascadeChild,
    cascadeGrandchild: first.cascadeGrandchild,
    cascadeMadre2: second.cascadeMadre,
    cascadeChild2: second.cascadeChild,
    cascadeGrandchild2: second.cascadeGrandchild,
    showSecondCascade: !!secondCatId,
  };
}

function normalizeMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function findCategoryByName(name: string, categories: AdminCatalogCategory[]): AdminCatalogCategory | undefined {
  const normalized = normalizeMatch(name);
  return categories.find(c => normalizeMatch(c.name) === normalized);
}

type UseCategoryCascadeInput = {
  categories: AdminCatalogCategory[];
  initialCategoryIds?: string[] | null;
};

export function useCategoryCascade({ categories, initialCategoryIds }: UseCategoryCascadeInput) {
  const init = () => initFromCategoryIds(initialCategoryIds, categories);

  const [cascadeMadre, setCascadeMadre] = useState(init().cascadeMadre);
  const [cascadeChild, setCascadeChild] = useState(init().cascadeChild);
  const [cascadeGrandchild, setCascadeGrandchild] = useState(init().cascadeGrandchild);
  const [cascadeMadre2, setCascadeMadre2] = useState(init().cascadeMadre2);
  const [cascadeChild2, setCascadeChild2] = useState(init().cascadeChild2);
  const [cascadeGrandchild2, setCascadeGrandchild2] = useState(init().cascadeGrandchild2);
  const [showSecondCascade, setShowSecondCascade] = useState(init().showSecondCascade);

  const madreCategories = categories.filter((category) => !category.parentId);

  const childCategories = cascadeMadre
    ? categories.filter(c => c.parentId === cascadeMadre)
    : [];

  const grandchildCategories = cascadeChild
    ? categories.filter(c => c.parentId === cascadeChild)
    : [];

  const childCats2 = cascadeMadre2
    ? categories.filter(c => c.parentId === cascadeMadre2)
    : [];

  const grandchildCats2 = cascadeChild2
    ? categories.filter(c => c.parentId === cascadeChild2)
    : [];

  const resolvedPrimary: string | null = (() => {
    if (cascadeGrandchild) return cascadeGrandchild;
    if (cascadeChild) return cascadeChild;
    if (cascadeMadre) return cascadeMadre;
    return null;
  })();

  const resolvedSecondary: string | null = (() => {
    if (cascadeGrandchild2) return cascadeGrandchild2;
    if (cascadeChild2) return cascadeChild2;
    if (cascadeMadre2) return cascadeMadre2;
    return null;
  })();

  const resolvedCategoryIds: string[] = [resolvedPrimary, resolvedSecondary].filter((id): id is string => id !== null);

  const handleCascadeMadre = (value: string) => {
    setCascadeMadre(value);
    setCascadeChild('');
    setCascadeGrandchild('');
  };

  const handleCascadeChild = (value: string) => {
    setCascadeChild(value);
    setCascadeGrandchild('');
  };

  const handleCascadeMadre2 = (value: string) => {
    setCascadeMadre2(value);
    setCascadeChild2('');
    setCascadeGrandchild2('');
  };

  const handleCascadeChild2 = (value: string) => {
    setCascadeChild2(value);
    setCascadeGrandchild2('');
  };

  const handleToggleSecondCascade = () => {
    if (showSecondCascade) {
      setCascadeMadre2('');
      setCascadeChild2('');
      setCascadeGrandchild2('');
    }
    setShowSecondCascade((prev) => !prev);
  };

  return {
    cascadeMadre, setCascadeMadre,
    cascadeChild, setCascadeChild,
    cascadeGrandchild, setCascadeGrandchild,
    cascadeMadre2, setCascadeMadre2,
    cascadeChild2, setCascadeChild2,
    cascadeGrandchild2, setCascadeGrandchild2,
    showSecondCascade, setShowSecondCascade,
    madreCategories,
    childCategories,
    grandchildCategories,
    childCats2,
    grandchildCats2,
    resolvedPrimary,
    resolvedSecondary,
    resolvedCategoryIds,
    handleCascadeMadre,
    handleCascadeChild,
    handleCascadeMadre2,
    handleCascadeChild2,
    handleToggleSecondCascade,
    findCategoryByName,
  };
}
