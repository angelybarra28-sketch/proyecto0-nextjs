import { NextResponse } from 'next/server';
import { getAdminSaleDetail } from '@/lib/services/adminSalesService';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const sale = await getAdminSaleDetail(id);

    if (!sale) {
      return NextResponse.json({ sale: null }, { status: 404 });
    }

    return NextResponse.json({ sale });
  } catch (error) {
    console.error('Error loading admin sale detail:', error);
    return NextResponse.json({ sale: null }, { status: 500 });
  }
}
