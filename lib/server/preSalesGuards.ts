const DEFAULT_RATE_LIMIT_MAX = 60;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_ITEMS = 50;
const MAX_STRING_LENGTH = 300;
const MAX_PAYLOAD_DEPTH = 4;

export interface PreSaleItemPayload {
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  installmentCount?: number;
}

export interface PreSaleInputPayload {
  fullName: string;
  phone?: string;
  address?: string;
  location?: string;
  items: PreSaleItemPayload[];
}

function jsonResponse(body: Record<string, unknown>, status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function isPreSalesDisabled(): boolean {
  return (process.env.PRE_SALES_DISABLED ?? '').trim().toLowerCase() === 'true';
}

export function preSalesDisabledGuard(): Response | null {
  if (!isPreSalesDisabled()) return null;
  return jsonResponse({ persisted: false, error: 'Pre-sales temporarily disabled' }, 503);
}

type RateBucket = { windowStart: number; count: number };

export type RateLimitCheck = (ip: string) => { allowed: boolean; retryAfterSeconds: number | null };

export function createPreSalesRateLimiter(): RateLimitCheck {
  const buckets = new Map<string, RateBucket>();

  return (ip: string) => {
    const enabled = (process.env.PRE_SALES_RATE_LIMIT_ENABLED ?? 'true').trim().toLowerCase() !== 'false';
    const max = parsePositiveInt(process.env.PRE_SALES_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX);
    const windowMs = parsePositiveInt(process.env.PRE_SALES_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS);

    if (!enabled) {
      return { allowed: true, retryAfterSeconds: null };
    }

    const now = Date.now();

    if (buckets.size > 10_000) {
      for (const [key, bucket] of buckets) {
        if (now - bucket.windowStart >= windowMs) buckets.delete(key);
      }
    }

    let bucket = buckets.get(ip);
    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { windowStart: now, count: 0 };
      buckets.set(ip, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfterMs = windowMs - (now - bucket.windowStart);
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    }

    return { allowed: true, retryAfterSeconds: null };
  };
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

const rateLimiter = createPreSalesRateLimiter();

export function preSalesRateLimitGuard(request: Request): Response | null {
  const { allowed, retryAfterSeconds } = rateLimiter(getClientIp(request));
  if (allowed) return null;
  return jsonResponse({ persisted: false, error: 'Too many requests' }, 429, {
    'Retry-After': String(retryAfterSeconds ?? 60),
  });
}

async function readBodyLimited(
  request: Request,
  limitBytes: number
): Promise<{ ok: true; text: string } | { ok: false }> {
  const reader = request.body?.getReader();
  if (!reader) {
    return { ok: true, text: '' };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    const value = chunk.value;
    if (value) {
      total += value.byteLength;
      if (total > limitBytes) {
        await reader.cancel();
        return { ok: false };
      }
      chunks.push(value);
    }
  }

  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, text: new TextDecoder().decode(buffer) };
}

function checkPayloadDepth(value: unknown, depth: number): boolean {
  if (depth > MAX_PAYLOAD_DEPTH) return false;
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!checkPayloadDepth(entry, depth + 1)) return false;
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (!checkPayloadDepth((value as Record<string, unknown>)[key], depth + 1)) return false;
    }
  }
  return true;
}

export async function parsePreSaleBody(request: Request): Promise<Response | PreSaleInputPayload> {
  const body = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!body.ok) {
    return jsonResponse({ persisted: false, error: 'Request body too large' }, 400);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.text);
  } catch {
    return jsonResponse({ persisted: false, error: 'Invalid JSON payload' }, 400);
  }

  if (!checkPayloadDepth(parsed, 0)) {
    return jsonResponse({ persisted: false, error: 'Payload nesting too deep' }, 400);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return jsonResponse({ persisted: false, error: 'Payload must be a JSON object' }, 400);
  }

  return parsed as unknown as PreSaleInputPayload;
}

const ITEM_FIELDS = new Set(['name', 'price', 'quantity', 'imageUrl', 'installmentCount']);
const STRING_FIELDS = ['phone', 'address', 'location'];

export function validatePreSalePayloadShape(raw: unknown): Response | PreSaleInputPayload {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return jsonResponse({ persisted: false, error: 'Payload must be a JSON object' }, 400);
  }

  const record = raw as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof record.fullName !== 'string') {
    errors.push('fullName must be a string');
  } else if (record.fullName.length > MAX_STRING_LENGTH) {
    errors.push('fullName is too long');
  }

  for (const field of STRING_FIELDS) {
    const value = record[field];
    if (value !== undefined && typeof value !== 'string') {
      errors.push(`${field} must be a string`);
    } else if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      errors.push(`${field} is too long`);
    }
  }

  if (!Array.isArray(record.items)) {
    errors.push('items must be an array');
  } else if (record.items.length > MAX_ITEMS) {
    errors.push(`too many items (max ${MAX_ITEMS})`);
  }

  if (errors.length > 0) {
    return jsonResponse({ persisted: false, error: errors.join('; ') }, 400);
  }

  const items = record.items as unknown[];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const label = `item[${i}]`;

    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      errors.push(`${label} must be an object`);
      continue;
    }

    const itemRecord = item as Record<string, unknown>;

    const unexpectedFields = Object.keys(itemRecord).filter((key) => !ITEM_FIELDS.has(key));
    if (unexpectedFields.length > 0) {
      errors.push(`${label} has unexpected fields`);
    }

    if (typeof itemRecord.name !== 'string' || itemRecord.name.length === 0) {
      errors.push(`${label}: name is required`);
    } else if (itemRecord.name.length > MAX_STRING_LENGTH) {
      errors.push(`${label}: name is too long`);
    }

    if (typeof itemRecord.price !== 'number') {
      errors.push(`${label}: price must be a number`);
    }
    if (typeof itemRecord.quantity !== 'number') {
      errors.push(`${label}: quantity must be a number`);
    }
    if (itemRecord.imageUrl !== undefined && typeof itemRecord.imageUrl !== 'string') {
      errors.push(`${label}: imageUrl must be a string`);
    }
    if (itemRecord.installmentCount !== undefined && typeof itemRecord.installmentCount !== 'number') {
      errors.push(`${label}: installmentCount must be a number`);
    }
  }

  if (errors.length > 0) {
    return jsonResponse({ persisted: false, error: errors.join('; ') }, 400);
  }

  const input: PreSaleInputPayload = {
    fullName: record.fullName as string,
    phone: record.phone as string | undefined,
    address: record.address as string | undefined,
    location: record.location as string | undefined,
    items: items as PreSaleItemPayload[],
  };

  return input;
}
