import { createHash } from 'crypto';

export function computeChecksum(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}
