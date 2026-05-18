import { resolveRequestId } from './request-id';

describe('request id helpers', () => {
  it('keeps a safe upstream request id', () => {
    expect(resolveRequestId('trace-12345678')).toBe('trace-12345678');
  });

  it('generates a new request id when the upstream value is unsafe', () => {
    const requestId = resolveRequestId('../bad');

    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
