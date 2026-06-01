import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import { registerCreditPayment } from '@/lib/services/creditAccountService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const requestContext = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await context.params;
    const body = (await request.json()) as {
      amount?: number;
      paymentDate?: string;
      notes?: string;
    };

    if (typeof body.amount !== 'number' || body.amount <= 0) {
      return errorResponse(new Error('amount debe ser un número positivo'), requestContext.requestId, 400);
    }

    const account = await registerCreditPayment(id, {
      amount: body.amount,
      paymentDate: body.paymentDate,
      notes: body.notes,
    });

    return NextResponse.json(
      { success: true, account },
      { headers: { 'x-request-id': requestContext.requestId } }
    );
  } catch (error) {
    const { id } = await context.params;
    const message = error instanceof Error ? error.message : '';

    if (message === 'PAYMENT_EXCEEDS_DEBT') {
      return NextResponse.json({ message: 'El monto del pago excede la deuda restante' }, { status: 409, headers: { 'x-request-id': requestContext.requestId } });
    }

    if (message === 'PAYMENT_INVALID_AMOUNT') {
      return NextResponse.json({ message: 'Monto de pago inválido' }, { status: 400, headers: { 'x-request-id': requestContext.requestId } });
    }

    logServerError({ area: 'admin.creditAccounts', action: 'payment', entity: 'creditAccount', entityId: id, requestId: requestContext.requestId, error });
    return errorResponse(error, requestContext.requestId, 500);
  }
}
