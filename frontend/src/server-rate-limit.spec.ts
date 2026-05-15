import { createRateLimit, readPositiveInteger, readTrustProxyConfig } from './server-rate-limit';

describe('server rate limit helpers', () => {
  it('keeps rate-limit buckets separated by resolved client ip', () => {
    const handler = createRateLimit(60_000, 1);
    const first = makeExchange('203.0.113.10');
    const second = makeExchange('203.0.113.11');

    handler(first.req as never, first.res as never, first.next);
    handler(second.req as never, second.res as never, second.next);

    expect(first.next).toHaveBeenCalled();
    expect(second.next).toHaveBeenCalled();
    expect(second.res.status).not.toHaveBeenCalled();
  });

  it('normalizes trust proxy configuration from environment values', () => {
    expect(readTrustProxyConfig(undefined)).toBeFalse();
    expect(readTrustProxyConfig('false')).toBeFalse();
    expect(readTrustProxyConfig('true')).toBeTrue();
    expect(readTrustProxyConfig('1')).toBe(1);
    expect(readTrustProxyConfig('loopback')).toBe('loopback');
  });

  it('falls back when a positive integer environment value is invalid', () => {
    expect(readPositiveInteger(undefined, 120)).toBe(120);
    expect(readPositiveInteger('0', 120)).toBe(120);
    expect(readPositiveInteger('abc', 120)).toBe(120);
    expect(readPositiveInteger('30', 120)).toBe(30);
  });
});

function makeExchange(ip: string): {
  req: { ip: string; socket: { remoteAddress: string } };
  res: {
    setHeader: jasmine.Spy;
    status: jasmine.Spy;
    json: jasmine.Spy;
  };
  next: jasmine.Spy;
} {
  return {
    req: {
      ip,
      socket: {
        remoteAddress: '10.0.0.25',
      },
    },
    res: {
      setHeader: jasmine.createSpy('setHeader'),
      status: jasmine.createSpy('status').and.returnValue({
        json: jasmine.createSpy('json'),
      }),
      json: jasmine.createSpy('json'),
    },
    next: jasmine.createSpy('next'),
  };
}
