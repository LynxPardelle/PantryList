import {
  applySecurityHeaders,
  getContentSecurityPolicy,
  getSecurityHeaders,
} from './server-security';

describe('server security headers', () => {
  it('applies browser security headers with CSP', () => {
    const res = makeResponse();
    const next = jasmine.createSpy('next');

    applySecurityHeaders({} as never, res as never, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'content-security-policy',
      jasmine.stringMatching("default-src 'self'"),
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'x-content-type-options',
      'nosniff',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'x-frame-options',
      'SAMEORIGIN',
    );
    expect(next).toHaveBeenCalled();
  });

  it('adds HSTS only in production', () => {
    expect(getSecurityHeaders({ nodeEnv: 'production' })).toEqual(
      jasmine.objectContaining({
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
      }),
    );
    expect(getSecurityHeaders()).not.toEqual(
      jasmine.objectContaining({
        'strict-transport-security': jasmine.any(String),
      }),
    );
  });

  it('allows CSP override from environment', () => {
    expect(getContentSecurityPolicy("default-src 'none'")).toBe(
      "default-src 'none'",
    );
  });
});

function makeResponse(): { setHeader: jasmine.Spy } {
  return {
    setHeader: jasmine.createSpy('setHeader'),
  };
}
