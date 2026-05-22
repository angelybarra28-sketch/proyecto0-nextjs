import { NextResponse } from 'next/server';
import { getAdminCollectionSummary } from '@/lib/services/adminSalesService';

export async function GET() {
  try {
    const summary = await getAdminCollectionSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error loading collection summary:', error);
    return NextResponse.json({ summary: null }, { status: 500 });
  }
}
