# Dokploy Deployment Notes

This project can run as a production-like Compose stack with:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production.local up -d --build
```

## Topology

- `frontend`: public Angular SSR server on container port `4000`.
- `backend`: internal NestJS/Fastify API on container port `3000`.
- `mongodb`: internal MongoDB on container port `27017`.
- Browser API calls use same-origin `/api`; the frontend SSR server proxies
  those requests to `BACKEND_URL`.

## Required Secrets

Set these in Dokploy or in a local untracked env file:

- `MONGO_INITDB_ROOT_USERNAME`
- `MONGO_INITDB_ROOT_PASSWORD`
- `MONGO_APP_USERNAME`
- `MONGO_APP_PASSWORD`
- `COGNITO_ENABLED=true`
- `COGNITO_ISSUER`
- `COGNITO_DOMAIN`
- `COGNITO_CLIENT_ID`
- `COGNITO_REDIRECT_URI`
- `COGNITO_LOGOUT_REDIRECT_URI`

`COGNITO_CLIENT_SECRET` is optional. Set it only when the Cognito app client is
configured as confidential.

## Cognito URLs

Register these URLs in the Cognito app client for the deployment domain:

- Callback URL: `https://<your-dokploy-domain>/api/auth/cognito/callback`
- Sign-out URL: `https://<your-dokploy-domain>/login`

For local production-like smoke testing on `FRONTEND_PORT=48674`, the example
callbacks are:

- `http://localhost:48674/api/auth/cognito/callback`
- `http://localhost:48674/login`

## Cookie Settings

- Keep `AUTH_COOKIE_SECURE=true` for HTTPS deployments.
- For local HTTP-only smoke tests, temporarily set `AUTH_COOKIE_SECURE=false`.
- Set `AUTH_COOKIE_DOMAIN` only if you need cookies shared across a parent
  domain. Leave it unset for a single Dokploy app domain.

## Local Smoke

Use a high port so this stack can coexist with the development stack:

```bash
FRONTEND_PORT=48674 docker compose -f docker-compose.prod.yml --env-file .env.production.local up -d --build
```

Then validate:

```bash
curl http://localhost:48674/healthz
curl http://localhost:48674/api/healthz
```

Full social-login smoke testing requires a real Cognito User Pool and provider
configuration. Without those env vars, auth endpoints fail closed instead of
falling back to local passwords.
