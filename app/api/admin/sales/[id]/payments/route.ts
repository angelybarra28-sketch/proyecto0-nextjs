import { NextResponse } from 'next/server';
import { getAdminUserContext, requireAdminUser } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/services/admin/audit';
import { registerAdminPayment } from '@/lib/services/paymentService';
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
  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const { id } = await params;
    const body = await request.json() as PaymentRequestBody;

    const result = await registerAdminPayment({
      saleId: id,
      paymentRequestId: body.paymentRequestId,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      paymentDate: body.paymentDate,
      notes: body.notes,
    });
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

    return NextResponse.json({ payment: result });
  } catch (error) {
    console.error('Error registering payment:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'No se pudo registrar el pago' },
      { status: 400 }
    );
  }
}
