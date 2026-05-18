import type { Request, Response } from 'express';

const SKIPPED_PROXY_HEADERS = new Set([
  'connection',
  'content-length',
  'forwarded',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
]);

export function buildProxyHeaders(req: Request): Headers {
  const headers = new Headers();

  Object.entries(req.headers).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase();

    if (!value || SKIPPED_PROXY_HEADERS.has(normalizedKey)) {
      return;
    }

    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  });

  if (!headers.has('x-request-id')) {
    headers.set('x-request-id', createRequestId());
  }

  headers.set('x-forwarded-host', req.hostname);
  headers.set('x-forwarded-proto', req.protocol);

  return headers;
}

export function applyApiCacheHeaders(res: Response): void {
  res.setHeader('cache-control', 'no-store');
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function createRequestId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
