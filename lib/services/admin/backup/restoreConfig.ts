export const DEFAULT_MAX_RESTORE_PAYLOAD_MB = 50;

export function parseMaxRestorePayloadMb(
  raw: string | undefined | null,
  fallback = DEFAULT_MAX_RESTORE_PAYLOAD_MB
): number {
  if (raw === undefined || raw === null || raw.trim() === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getMaxRestorePayloadMb(): number {
  return parseMaxRestorePayloadMb(process.env.BACKUP_MAX_SIZE_MB);
}

export function getMaxRestorePayloadBytes(maxMb: number): number {
  return Math.floor(maxMb * 1024 * 1024);
}

export function buildPayloadTooLargeMessage(maxMb: number): string {
  return `El backup supera el tamaño máximo permitido (${maxMb}MB). Restore cancelado sin modificar la base.`;
}

export function getRestorePayloadError(rawJson: string, maxMb: number): string | null {
  const payloadBytes = Buffer.byteLength(rawJson, 'utf8');
  if (payloadBytes > getMaxRestorePayloadBytes(maxMb)) {
    return buildPayloadTooLargeMessage(maxMb);
  }
  return null;
}
