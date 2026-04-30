import { createHash } from 'crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function computeHashChain(
  prevHash: string,
  timestamp: string,
  userId: string,
  action: string,
  entityId: string,
): string {
  return sha256(`${prevHash}${timestamp}${userId}${action}${entityId}`);
}
