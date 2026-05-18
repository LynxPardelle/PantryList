import type { NextFunction, Request, Response } from 'express';

const DEFAULT_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "form-action 'self' https://*.amazoncognito.com",
].join('; ');

export interface SecurityHeaderOptions {
  contentSecurityPolicy?: string;
  nodeEnv?: string;
}

export function applySecurityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  Object.entries(getSecurityHeaders(readSecurityHeaderOptions())).forEach(
    ([name, value]) => res.setHeader(name, value),
  );

  next();
}

export function getSecurityHeaders(
  options: SecurityHeaderOptions = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    'content-security-policy': getContentSecurityPolicy(
      options.contentSecurityPolicy,
    ),
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'SAMEORIGIN',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  };

  if (options.nodeEnv === 'production') {
    headers['strict-transport-security'] =
      'max-age=31536000; includeSubDomains';
  }

  return headers;
}

export function getContentSecurityPolicy(
  contentSecurityPolicy?: string,
): string {
  return contentSecurityPolicy ?? DEFAULT_CONTENT_SECURITY_POLICY;
}

function readSecurityHeaderOptions(): SecurityHeaderOptions {
  const env =
    (
      globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env ?? {};

  return {
    contentSecurityPolicy: env['CONTENT_SECURITY_POLICY'],
    nodeEnv: env['NODE_ENV'],
  };
}
