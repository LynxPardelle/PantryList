import { applyStaticAssetCacheHeaders, HeaderWriter } from './server-static-cache';

describe('server static cache headers', () => {
  it('prevents long-lived browser cache for prerendered html routes', () => {
    const res = makeHeaderWriter();

    applyStaticAssetCacheHeaders(res, '/app/dist/frontend/browser/login/index.html');

    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
  });

  it('keeps hashed static assets on the express static cache policy', () => {
    const res = makeHeaderWriter();

    applyStaticAssetCacheHeaders(res, '/app/dist/frontend/browser/main-ABC123.js');

    expect(res.setHeader).not.toHaveBeenCalled();
  });
});

function makeHeaderWriter(): HeaderWriter {
  return {
    setHeader: jasmine.createSpy('setHeader'),
  };
}
