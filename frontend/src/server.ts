import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import AppServerModule from './main.server';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');
const backendUrl = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

const app = express();
const commonEngine = new CommonEngine();

app.get('/healthz', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'pantrylist-frontend',
  });
});

app.use('/api', express.json(), async (req, res, next) => {
  try {
    const targetPath = req.originalUrl || '/api';
    const targetUrl = new URL(targetPath, backendUrl);
    const headers = new Headers();

    Object.entries(req.headers).forEach(([key, value]) => {
      if (!value || key === 'host' || key === 'content-length') {
        return;
      }

      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    });

    const requestInit: RequestInit = {
      method: req.method,
      headers,
    };

    if (
      !['GET', 'HEAD'].includes(req.method.toUpperCase()) &&
      req.body &&
      Object.keys(req.body).length > 0
    ) {
      requestInit.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, requestInit);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key === 'content-length' || key === 'content-encoding') {
        return;
      }

      res.setHeader(key, value);
    });

    const payload = Buffer.from(await response.arrayBuffer());
    res.send(payload);
  } catch (error) {
    next(error);
  }
});

/**
 * Serve static files from /browser
 */
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html'
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap: AppServerModule,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;
