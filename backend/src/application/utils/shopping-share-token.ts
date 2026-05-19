import { createHash, randomBytes } from 'crypto';

const SAFE_SHOPPING_SHARE_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{16,256}$/;

export function generateShoppingShareToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashShoppingShareToken(token: string): string {
  return createHash('sha256')
    .update(normalizeShoppingShareToken(token))
    .digest('hex');
}

export function normalizeShoppingShareToken(token: string): string {
  const normalizedToken = token.trim();

  if (!SAFE_SHOPPING_SHARE_TOKEN_PATTERN.test(normalizedToken)) {
    throw new Error('Shopping share token must match URL-safe format');
  }

  return normalizedToken;
}
