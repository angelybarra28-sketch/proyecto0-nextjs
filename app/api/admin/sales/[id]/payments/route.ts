import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/services/admin/audit';
import { registerAdminPayment } from '@/lib/services/paymentService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { isMaintenanceModeActive, maintenanceModeResponse } from '@/lib/server/maintenance';
import { measureAsync } from '@/lib/server/runtimeMetrics';
import type { PaymentMethod } from '@/lib/supabase/types';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

interface PaymentRequestBody {
  paymentRequestId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  notes?: string;
}

export async function POST(request: Request, { params }: Props) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    if (isMaintenanceModeActive()) {
      return maintenanceModeResponse(context.requestId);
    }

    const { id } = await params;
    const body = await request.json() as PaymentRequestBody;

    const result = await measureAsync('admin.sales.payments', 'register', () => registerAdminPayment({
      saleId: id,
      paymentRequestId: body.paymentRequestId,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      paymentDate: body.paymentDate,
      notes: body.notes,
    }), context.requestId);
    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'payment_registered',
      entity: 'sale',
      entityId: id,
      metadata: {
        paymentId: result.paymentId,
        paymentRequestId: body.paymentRequestId,
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        collectionStatus: result.collectionStatus,
      },
    });

    return NextResponse.json({ payment: result }, { headers: { 'x-request-id': context.requestId } });
  } catch (error) {
    const { id } = await params;
    logServerError({ area: 'admin.sales.payments', action: 'register', entity: 'sale', entityId: id, requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 400);
  }
}
