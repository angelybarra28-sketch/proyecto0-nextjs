import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { getEstadisticasCompras } from '@/lib/services/admin/proveedores';

export async function GET(request: Request) {
  const context = createRequestContext(request);
  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const stats = await getEstadisticasCompras();
    return NextResponse.json(stats, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    logServerError({ area: 'admin.proveedores', action: 'estadisticas', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
