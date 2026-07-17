'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/CategoryNavBar.module.css';

function slugifyCategory(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

type CatItem = {
  id: string;
  name: string;
  slug: string;
};

type CategoryGroup = {
  id: string;
  name: string;
  slug: string;
  categories: {
    id: string;
    name: string;
    slug: string;
    subcategories: CatItem[];
  }[];
};

const NAV_MADRE_SLUGS = ['blanqueria', 'articulos-del-hogar'];

const FALLBACK_LEFT: CategoryGroup = {
  id: 'fb-blanqueria',
  name: 'Blanqueria',
  slug: 'blanqueria',
  categories: [],
};

const FALLBACK_RIGHT: CategoryGroup = {
  id: 'fb-articulos',
  name: 'Artículos del Hogar',
  slug: 'articulos-del-hogar',
  categories: [],
};

export default function CategoryNavBar({ floating }: { floating?: boolean }) {
  const [madreGroups, setMadreGroups] = useState<CategoryGroup[]>([]);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error(`Expected JSON, got ${ct}`);
        return res.json();
      })
      .then((data) => {
        if (data.madreGroups) {
          setMadreGroups(data.madreGroups);
        }
      })
      .catch((err) => console.error('Error loading category nav:', err));
  }, []);

  function findMadre(slug: string): CategoryGroup | undefined {
    return madreGroups.find(
      (m) => (m.slug || slugifyCategory(m.name)) === slug
    );
  }

  const leftGroup = findMadre(NAV_MADRE_SLUGS[0]) ?? FALLBACK_LEFT;
  const rightGroup = findMadre(NAV_MADRE_SLUGS[1]) ?? FALLBACK_RIGHT;

  function renderMadreItem(group: CategoryGroup) {
    const btnClass = floating ? styles.floatingButton : styles.uiverseButton;
    return (
      <li>
        <Link
          href={`/categoria/${encodeURIComponent(group.slug || slugifyCategory(group.name))}`}
          className={btnClass}
        >
          <span className={styles.buttonText}>{group.name}</span>
        </Link>
        {group.categories.length > 0 && (
          <ul className={styles.submenu}>
            {group.categories.map((cat) => (
              <li key={cat.id} className={styles.submenuItem}>
                <Link
                  href={`/categoria/${encodeURIComponent(cat.slug || slugifyCategory(cat.name))}`}
                >
                  {cat.name}
                </Link>
                {cat.subcategories.length > 0 && (
                  <ul className={styles.nestedSubmenu}>
                    {cat.subcategories.map((sub) => (
                      <li key={sub.id}>
                        <Link
                          href={`/categoria/${encodeURIComponent(sub.slug || slugifyCategory(sub.name))}`}
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  if (floating) {
    return (
      <ul className={styles.floatingNav}>
        {renderMadreItem(leftGroup)}
        {renderMadreItem(rightGroup)}
      </ul>
    );
  }

  return (
    <nav className={styles.categoryNavBar}>
      <ul className={styles.mainNav}>
        {renderMadreItem(leftGroup)}
        {renderMadreItem(rightGroup)}
      </ul>
    </nav>
  );
}
