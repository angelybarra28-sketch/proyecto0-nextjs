import { NextResponse } from 'next/server';
import { requireStrictAdminUser } from '@/lib/auth/server';
import {
  listCreditAccountSummaries,
  createCreditAccount,
  getCreditDashboard,
} from '@/lib/services/creditAccountService';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const url = new URL(request.url);
    const withDashboard = url.searchParams.get('dashboard') === 'true';

    const accounts = await listCreditAccountSummaries();

    if (withDashboard) {
      const dashboard = await getCreditDashboard();
      return NextResponse.json(
        { accounts, dashboard },
        { headers: { 'x-request-id': context.requestId } }
      );
    }

    return NextResponse.json(
      { accounts },
      { headers: { 'x-request-id': context.requestId } }
    );
  } catch (error) {
    logServerError({ area: 'admin.creditAccounts', action: 'list', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}

export async function POST(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const body = (await request.json()) as {
      customerId?: string;
      productName?: string;
      quantity?: number;
      installmentCount?: number;
      installmentAmount?: number;
      saleDate?: string;
      notes?: string;
    };

    if (!body.customerId || typeof body.customerId !== 'string') {
      return errorResponse(new Error('customerId es requerido'), context.requestId, 400);
    }
    if (!body.productName || typeof body.productName !== 'string') {
      return errorResponse(new Error('productName es requerido'), context.requestId, 400);
    }
    if (typeof body.installmentAmount !== 'number' || body.installmentAmount <= 0) {
      return errorResponse(new Error('installmentAmount debe ser un número positivo'), context.requestId, 400);
    }

    const account = await createCreditAccount({
      customerId: body.customerId,
      productName: body.productName,
      quantity: body.quantity,
      installmentCount: body.installmentCount,
      installmentAmount: body.installmentAmount,
      saleDate: body.saleDate,
      notes: body.notes,
    });

    return NextResponse.json(
      { success: true, account },
      { headers: { 'x-request-id': context.requestId } }
    );
  } catch (error) {
    logServerError({ area: 'admin.creditAccounts', action: 'create', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
