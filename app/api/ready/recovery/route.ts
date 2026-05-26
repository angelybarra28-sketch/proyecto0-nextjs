import { NextResponse } from 'next/server';
import { runRecoveryReadinessChecks } from '@/lib/server/readiness';

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const checks = await runRecoveryReadinessChecks();
  const success = checks.every((check) => check.success);

  return NextResponse.json({
    success,
    checks,
    timestamp: new Date().toISOString(),
    requestId,
  }, {
    status: success ? 200 : 503,
    headers: { 'x-request-id': requestId },
  });
}
