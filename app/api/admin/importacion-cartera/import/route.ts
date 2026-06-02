import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { importPortfolioBatch } from '@/lib/services/importPortfolioService';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function POST(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const body = (await request.json()) as {
      rows?: import('@/lib/types').ImportPortfolioRow[];
    };

    if (!body.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
      return errorResponse(new Error('No se enviaron filas para importar'), context.requestId, 400);
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return errorResponse(new Error('Supabase no está configurado'), context.requestId, 500);
    }

    const result = await importPortfolioBatch(supabase, body.rows);

    return NextResponse.json({ result }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.importPortfolio', action: 'import', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
