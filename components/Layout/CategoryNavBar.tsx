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

const NAV_MADRE_SLUGS = ['blanqueria', 'electrodomesticos-y-articulos'];

export default function CategoryNavBar() {
  const [madreGroups, setMadreGroups] = useState<CategoryGroup[]>([]);
  const [topOffset, setTopOffset] = useState(0);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.madreGroups) {
          setMadreGroups(data.madreGroups);
        }
      })
      .catch((err) => console.error('Error loading category nav:', err));
  }, []);

  useEffect(() => {
    const el = document.querySelector('header');
    if (!el) return;

    const updateHeight = () => {
      setTopOffset(el.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function findMadre(slug: string): CategoryGroup | undefined {
    return madreGroups.find(
      (m) => (m.slug || slugifyCategory(m.name)) === slug
    );
  }

  const leftGroup = findMadre(NAV_MADRE_SLUGS[0]);
  const rightGroup = findMadre(NAV_MADRE_SLUGS[1]);

  function renderMadreItem(group: CategoryGroup) {
    return (
      <li>
        <Link
          href={`/categoria/${encodeURIComponent(group.slug || slugifyCategory(group.name))}`}
          className={styles.uiverseButton}
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

  return (
    <nav
      className={styles.categoryNavBar}
      style={{ top: topOffset }}
    >
      <ul className={styles.mainNav}>
        {leftGroup && renderMadreItem(leftGroup)}
        {rightGroup && renderMadreItem(rightGroup)}
      </ul>
    </nav>
  );
}
