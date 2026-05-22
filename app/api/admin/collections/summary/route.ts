import { NextResponse } from 'next/server';
import { getAdminCollectionSummary } from '@/lib/services/adminSalesService';
import { requireAdminUser } from '@/lib/auth/server';

export async function GET() {
  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const summary = await getAdminCollectionSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error loading collection summary:', error);
    return NextResponse.json({ summary: null }, { status: 500 });
  }
}
