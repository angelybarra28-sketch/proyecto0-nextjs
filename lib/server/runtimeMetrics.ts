import { logServerEvent } from '@/lib/server/logging';

export type RuntimeMetric = {
  area: string;
  action: string;
  durationMs: number;
  success: boolean;
  requestId?: string;
};

const metrics: RuntimeMetric[] = [];
const maxMetrics = 200;

export function recordRuntimeMetric(metric: RuntimeMetric): void {
  metrics.push(metric);
  if (metrics.length > maxMetrics) metrics.shift();
  logServerEvent({
    level: metric.success ? 'info' : 'warn',
    area: metric.area,
    action: metric.action,
    requestId: metric.requestId,
    metadata: {
      durationMs: metric.durationMs,
      success: metric.success,
    },
  });
}

export async function measureAsync<TValue>(
  area: string,
  action: string,
  operation: () => Promise<TValue>,
  requestId?: string
): Promise<TValue> {
  const startedAt = performance.now();

  try {
    const value = await operation();
    recordRuntimeMetric({ area, action, requestId, success: true, durationMs: Math.round(performance.now() - startedAt) });
    return value;
  } catch (error) {
    recordRuntimeMetric({ area, action, requestId, success: false, durationMs: Math.round(performance.now() - startedAt) });
    throw error;
  }
}

export function getRuntimeMetrics(): RuntimeMetric[] {
  return [...metrics];
}
