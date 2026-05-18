import { applyApiCacheHeaders, buildProxyHeaders, isAbortError } from './server-proxy';

describe('server proxy helpers', () => {
  it('sanitizes hop-by-hop headers and forwards safe request context', () => {
    const headers = buildProxyHeaders({
      headers: {
        connection: 'keep-alive',
        cookie: 'session=abc',
        host: 'public.example',
        'x-xsrf-token': 'xsrf-token',
      },
      hostname: 'pantrylist.example',
      protocol: 'https',
    } as never);

    expect(headers.get('connection')).toBeNull();
    expect(headers.get('host')).toBeNull();
    expect(headers.get('cookie')).toBe('session=abc');
    expect(headers.get('x-xsrf-token')).toBe('xsrf-token');
    expect(headers.get('x-forwarded-host')).toBe('pantrylist.example');
    expect(headers.get('x-forwarded-proto')).toBe('https');
    expect(headers.get('x-request-id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('marks proxied API responses as non-cacheable', () => {
    const res = {
      setHeader: jasmine.createSpy('setHeader'),
    };

    applyApiCacheHeaders(res as never);

    expect(res.setHeader).toHaveBeenCalledWith('cache-control', 'no-store');
  });

  it('detects abort errors for proxy timeout handling', () => {
    const error = new Error('aborted');
    error.name = 'AbortError';

    expect(isAbortError(error)).toBeTrue();
  });
});
