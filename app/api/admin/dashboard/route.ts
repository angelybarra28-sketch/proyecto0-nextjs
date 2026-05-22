import { NextResponse } from 'next/server';
import { getAdminDashboard } from '@/lib/services/adminDashboardService';
import { requireAdminUser } from '@/lib/auth/server';

export async function GET() {
  try {
    const authorizationError = await requireAdminUser();
    if (authorizationError) return authorizationError;

    const dashboard = await getAdminDashboard();
    return NextResponse.json({ dashboard });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    return NextResponse.json({ dashboard: null }, { status: 500 });
  }
}
