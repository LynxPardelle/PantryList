import { createHash, randomBytes } from 'crypto';

const SAFE_HOUSEHOLD_INVITE_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{16,256}$/;

export function generateHouseholdInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashHouseholdInviteToken(token: string): string {
  return createHash('sha256')
    .update(normalizeHouseholdInviteToken(token))
    .digest('hex');
}

export function normalizeHouseholdInviteToken(token: string): string {
  const normalizedToken = token.trim();

  if (!SAFE_HOUSEHOLD_INVITE_TOKEN_PATTERN.test(normalizedToken)) {
    throw new Error('Household invite token must match URL-safe format');
  }

  return normalizedToken;
}
