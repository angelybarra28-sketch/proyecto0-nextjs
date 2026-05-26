import { NextResponse } from 'next/server';
import packageJson from '@/package.json';

const startedAt = Date.now();

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  return NextResponse.json({
    status: 'ok',
    uptime: Math.round((Date.now() - startedAt) / 1000),
    version: packageJson.version,
    timestamp: new Date().toISOString(),
  }, { headers: { 'x-request-id': requestId } });
}
