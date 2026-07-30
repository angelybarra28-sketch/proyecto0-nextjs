import { NextResponse } from 'next/server';
import { getAdminUserContext, requireStrictAdminUser } from '@/lib/auth/server';
import {
  listCreditAccountSummaries,
  listCreditAccountSummariesPaginated,
  createCreditAccount,
  getCreditDashboard,
} from '@/lib/services/creditAccountService';
import { logAdminAction } from '@/lib/services/admin/audit';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';

export async function GET(request: Request) {
  const context = createRequestContext(request);

  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const url = new URL(request.url);
    const withDashboard = url.searchParams.get('dashboard') === 'true';
    const search = url.searchParams.get('search') ?? undefined;
    const statusFilter = url.searchParams.get('statusFilter') as 'active' | 'finished' | 'all' | undefined;
    const pageParam = url.searchParams.get('page');
    const pageSizeParam = url.searchParams.get('pageSize');
    const filterMonthParam = url.searchParams.get('filterMonth');
    const filterYearParam = url.searchParams.get('filterYear');
    const filterPaymentStatus = url.searchParams.get('filterPaymentStatus') as 'paid' | 'pending' | null | undefined;

    const usePagination = pageParam !== null || pageSizeParam !== null;

    if (usePagination) {
      const page = Math.max(1, Number(pageParam) || 1);
      const pageSize = Math.min(100000, Math.max(1, Number(pageSizeParam) || 15));
      const filterMonth = filterMonthParam !== null ? Number(filterMonthParam) : undefined;
      const filterYear = filterYearParam !== null ? Number(filterYearParam) : undefined;

      const result = await listCreditAccountSummariesPaginated({
        page,
        pageSize,
        search,
        statusFilter: statusFilter ?? 'active',
        filterMonth,
        filterYear,
        filterPaymentStatus: filterPaymentStatus ?? undefined,
      });

      if (withDashboard) {
        const dashboard = await getCreditDashboard();
        return NextResponse.json(
          { accounts: result.accounts, dashboard, totalCount: result.totalCount, page: result.page, pageSize: result.pageSize },
          { headers: { 'x-request-id': context.requestId } }
        );
      }

      return NextResponse.json(
        { accounts: result.accounts, totalCount: result.totalCount, page: result.page, pageSize: result.pageSize },
        { headers: { 'x-request-id': context.requestId } }
      );
    }

    const accounts = await listCreditAccountSummaries({ search, statusFilter });

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
      operationNumber?: string;
      productName?: string;
      quantity?: number;
      items?: Array<{ productName: string; quantity: number; unitPrice?: number }>;
      installmentCount?: number;
      installmentAmount?: number;
      saleDate?: string;
      notes?: string;
    };

    if (!body.customerId || typeof body.customerId !== 'string') {
      return errorResponse(new Error('customerId es requerido'), context.requestId, 400);
    }

    const hasItems = body.items && Array.isArray(body.items) && body.items.length > 0;
    const hasProductName = body.productName && typeof body.productName === 'string';
    if (!hasItems && !hasProductName) {
      return errorResponse(new Error('Debe proporcionar al menos un producto (items o productName)'), context.requestId, 400);
    }

    if (typeof body.installmentAmount !== 'number' || body.installmentAmount <= 0) {
      return errorResponse(new Error('installmentAmount debe ser un número positivo'), context.requestId, 400);
    }

    const account = await createCreditAccount({
      customerId: body.customerId,
      operationNumber: body.operationNumber,
      productName: body.productName,
      quantity: body.quantity,
      items: body.items,
      installmentCount: body.installmentCount,
      installmentAmount: body.installmentAmount,
      saleDate: body.saleDate,
      notes: body.notes,
    });

    const adminUser = await getAdminUserContext();
    await logAdminAction({
      adminUserId: adminUser?.userId ?? null,
      action: 'credit_account_created',
      entity: 'creditAccount',
      entityId: account.id,
      metadata: {
        customerId: body.customerId,
        installmentCount: body.installmentCount,
        installmentAmount: body.installmentAmount,
      },
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
