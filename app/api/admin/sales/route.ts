import { NextResponse } from 'next/server';
import { listAdminSales } from '@/lib/services/adminSalesService';
import { requireAdminUser } from '@/lib/auth/server';

export async function GET() {
  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const sales = await listAdminSales();
    return NextResponse.json({ sales });
  } catch (error) {
    console.error('Error loading admin sales:', error);
    return NextResponse.json({ sales: [] }, { status: 500 });
  }
}
