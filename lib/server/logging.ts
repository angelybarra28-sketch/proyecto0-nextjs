import { randomUUID } from 'crypto';

export type ServerLogLevel = 'info' | 'warn' | 'error' | 'critical';

export type RequestContext = {
  requestId: string;
  userId?: string | null;
};

export type ServerLogInput = {
  level?: ServerLogLevel;
  area: string;
  action: string;
  entity?: string;
  entityId?: string | null;
  requestId?: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  error?: unknown;
};

const sensitiveKeys = ['service_role', 'serviceRole', 'token', 'password', 'cookie', 'authorization', 'apikey', 'apiKey', 'secret'];

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeys.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey.toLowerCase()))
        ? '[REDACTED]'
        : sanitizeValue(item),
    ])
  );
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error === undefined ? undefined : { message: String(error) };
}

export function createRequestContext(request?: Request): RequestContext {
  return {
    requestId: request?.headers.get('x-request-id') || randomUUID(),
  };
}

export function logServerEvent(input: ServerLogInput): void {
  const payload = {
    level: input.level ?? 'info',
    area: input.area,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    requestId: input.requestId,
    userId: input.userId,
    metadata: sanitizeValue(input.metadata),
    error: formatError(input.error),
    timestamp: new Date().toISOString(),
  };

  const serialized = JSON.stringify(payload);

  if (payload.level === 'error' || payload.level === 'critical') {
    console.error(serialized);
    return;
  }

  if (payload.level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function logServerError(input: Omit<ServerLogInput, 'level'>): void {
  logServerEvent({ ...input, level: 'error' });
}
