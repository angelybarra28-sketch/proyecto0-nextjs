import { NextResponse } from 'next/server';
import { listAdminSales } from '@/lib/services/adminSalesService';

export async function GET() {
  try {
    const sales = await listAdminSales();
    return NextResponse.json({ sales });
  } catch (error) {
    console.error('Error loading admin sales:', error);
    return NextResponse.json({ sales: [] }, { status: 500 });
  }
}
