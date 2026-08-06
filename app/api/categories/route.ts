import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { listActiveCategories } from '@/lib/repositories/categoryRepository';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export type PublicCategoryItem = {
  id: string;
  name: string;
  slug: string;
};

export type PublicCategoryTree = {
  id: string;
  name: string;
  slug: string;
  categories: {
    id: string;
    name: string;
    slug: string;
    subcategories: PublicCategoryItem[];
  }[];
};

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export async function GET(request: Request) {
  const requestContext = createRequestContext(request);

  try {
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return NextResponse.json({ madreGroups: [] }, { headers: { 'x-request-id': requestContext.requestId } });
    }

    const rows = await listActiveCategories(supabase);

    // Level 1: madre groups (no parent)
    const madres = rows.filter((r) => !r.parent_id);

    // Level 2: categories (parent is a madre)
    // Level 3: subcategories (parent is a category)
    const madreGroups: PublicCategoryTree[] = madres.map((madre) => {
      const children = rows.filter((r) => r.parent_id === madre.id);
      const categories = children.map((child) => {
        const grandchildren = rows.filter((r) => r.parent_id === child.id);
        return {
          id: child.id,
          name: child.name,
          slug: child.slug || slugify(child.name),
          subcategories: grandchildren.map((g) => ({
            id: g.id,
            name: g.name,
            slug: g.slug || slugify(g.name),
          })),
        };
      });

      return {
        id: madre.id,
        name: madre.name,
        slug: madre.slug || slugify(madre.name),
        categories,
      };
    });

    return NextResponse.json({ madreGroups }, { headers: { 'x-request-id': requestContext.requestId } });
  } catch (error) {
    logServerError({ area: 'categories', action: 'list', requestId: requestContext.requestId, error });
    return NextResponse.json({ madreGroups: [] }, { headers: { 'x-request-id': requestContext.requestId } });
  }
}
