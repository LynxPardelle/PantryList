import type { RequestHandler } from 'express';

export type TrustProxyConfig = boolean | number | string;

export function createRateLimit(
  windowMs: number,
  maxRequests: number,
): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const now = Date.now();

    if (buckets.size > 1000) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = buckets.get(key);
    const bucket =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > maxRequests) {
      res.setHeader('retry-after', Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({ message: 'Too many requests' });
      return;
    }

    next();
  };
}

export function readPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function readTrustProxyConfig(
  value: string | undefined,
): TrustProxyConfig {
  if (value === undefined || value.trim() === '') {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  const parsed = Number(normalized);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return value.trim();
}
