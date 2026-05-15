# Technical Risk Feature Ideas

Date: 2026-05-15

Status: Research notes and backlog candidates. This is not an approved implementation spec.

## Goal

Capture product and platform features that PantryList may need because of technical gaps, vulnerabilities, operational risk, or missing production best practices.

This list is based on a lightweight repository review and non-destructive scans run on 2026-05-15.

## Evidence Summary

- `npm audit --json` in `backend/` returned 2 high vulnerabilities.
- `npm audit --json` in `frontend/` returned 8 total vulnerabilities: 2 high and 6 moderate.
- `npm audit --omit=dev --json` in `frontend/` returned 1 runtime vulnerability in `@angular/ssr`.
- `npm audit --json` in `infra/cognito/` returned 1 high vulnerability.
- Local secret scan returned `count: 0`.
- Current GitHub Actions workflow runs install, tests, e2e, lint, and build, but no visible SCA, CodeQL, secret scan, or container scan.

## P0 / P1 Security And Dependency Features

### 1. Automated Dependency Security Program

Priority: P0

Why it matters:

- Current scans returned active vulnerabilities in backend, frontend, and infrastructure dependencies.
- Fixes were reported as available by `npm audit`.

Evidence:

- `backend/`: `npm audit --json` returned 2 high vulnerabilities.
- `frontend/`: `npm audit --json` returned 8 total vulnerabilities.
- `infra/cognito/`: `npm audit --json` returned 1 high vulnerability.

Feature idea:

- Add Dependabot or Renovate.
- Add CI gates for `npm audit --omit=dev` on runtime packages.
- Track dev-tooling vulnerabilities separately so they do not block runtime releases unless exploitable in CI/build context.

### 2. Angular SSR Security Upgrade

Priority: P0

Why it matters:

- Frontend runtime audit returned a vulnerability in `@angular/ssr@21.2.8`: open redirect and request steering through encoded `X-Forwarded-Prefix`.

Evidence:

- `frontend/package.json` uses `@angular/ssr`.
- `npm audit --omit=dev --json` in `frontend/` returned 1 moderate runtime vulnerability in `@angular/ssr`.

Feature idea:

- Upgrade Angular SSR to a patched version.
- Add regression smoke tests for redirected SSR requests and forwarded-prefix handling.

### 3. API Rate Limiting And Anti-Abuse Controls

Priority: P1

Why it matters:

- Auth, inventory mutation, search, and refresh endpoints can be abused without request throttling.
- PantryList uses cookie auth and Cognito; brute force and refresh abuse should still be rate limited at app or edge level.

Evidence:

- `backend/src/app.setup.ts` configures CORS, cookies, validation, Helmet, and Swagger, but no rate limiting was visible.
- `frontend/src/server.ts` proxies `/api` without visible rate limiting.

Feature idea:

- Add per-IP and per-user rate limits.
- Apply stricter limits to `/api/auth/*`, mutating inventory endpoints, and search endpoints.
- Include safe headers and user-facing retry behavior.

### 4. SSR Proxy Hardening

Priority: P1

Why it matters:

- The frontend Express server proxies `/api` to the backend and forwards request/response headers.
- Proxy layers are common places for header confusion, oversized payloads, timeout gaps, and cache mistakes.

Evidence:

- `frontend/src/server.ts` defines the Express app and `/api` proxy.
- The proxy uses `express.json()` and `fetch()`, but no explicit timeout, payload limit, Helmet, or rate limit was visible.

Feature idea:

- Add request body size limits.
- Add proxy timeouts and abort handling.
- Sanitize forwarded headers.
- Add explicit cache-control behavior for auth/API responses.
- Add SSR security headers.

### 5. Frontend And Edge Security Headers

Priority: P1

Why it matters:

- Backend Helmet is enabled, but the SSR frontend and CloudFront layer also serve pages and static assets.
- User sessions rely on browser behavior, cookies, and same-origin requests.

Evidence:

- `backend/src/app.setup.ts` registers `fastifyHelmet`.
- `frontend/src/server.ts` did not show Helmet or explicit security headers.

Feature idea:

- Add Content Security Policy.
- Add HSTS, `X-Frame-Options` or `frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, and `X-Content-Type-Options`.
- Ensure headers are applied by SSR and/or CloudFront response headers policy.

### 6. Session Revocation And Device Management

Priority: P1

Why it matters:

- Logout clears local cookies, but a stronger account security model should support revoking refresh sessions and signing out other devices.

Evidence:

- `backend/src/infrastructure/http/controllers/auth.controller.ts` clears local cookies on logout.
- `backend/src/infrastructure/auth/cognito/cognito-token-client.service.ts` supports token exchange and refresh, but no revocation call was visible.

Feature idea:

- Add Cognito token revocation on logout where supported.
- Add "Cerrar sesion en todos los dispositivos".
- Add a session/device list if the product later supports multiple active devices.

### 7. Optional MFA / Step-Up Authentication

Priority: P1

Why it matters:

- Household inventory can reveal sensitive routines, health needs, income signals, and family composition.
- MFA is valuable before adding shared households, payments, exports, and richer profile data.

Evidence:

- Cognito stack has strong password policy and `preventUserExistenceErrors`.
- No MFA configuration was visible in `infra/cognito/lib/pantrylist-cognito-stack.ts`.

Feature idea:

- Support optional MFA.
- Consider step-up prompts before destructive actions, data export, account deletion, and billing changes.

## P1 / P2 Robustness Features

### 8. Domain Error Normalization

Priority: P1

Why it matters:

- Some domain errors are plain `Error` instances. If not translated, they can become `500` responses instead of clean `400` validation errors.

Evidence:

- `ConsumeInventoryLotUseCase` calls `inventoryLot.consume(quantity)`.
- `InventoryLot.consume()` throws `Error` when quantity exceeds available lot quantity.

Feature idea:

- Add a domain exception mapper or use explicit application-level checks before domain mutation.
- Ensure user mistakes return `400`, missing resources return `404`, and unexpected failures return sanitized `500`.

### 9. Observability Baseline

Priority: P1

Why it matters:

- Production issues need request IDs, structured logs, error reporting, and latency/error metrics.
- This becomes more important with Cognito, DynamoDB, CloudFront, SSR, and future payment/AI features.

Evidence:

- No OpenTelemetry, Sentry, Prometheus, correlation ID, or structured request logging setup was visible in the reviewed files.

Feature idea:

- Add request correlation IDs.
- Add structured logging.
- Track auth failures, API latency, DynamoDB failures, SSR proxy failures, and uncaught exceptions.
- Add alerting for 5xx spikes and auth callback failures.

### 10. Pagination And Query Limits

Priority: P1

Why it matters:

- Household data can grow over time.
- Unbounded reads increase latency and cost and can hit DynamoDB page limits.

Evidence:

- DynamoDB repositories use `QueryCommand` for user-owned lists.
- Legacy product repository includes a `ScanCommand`.
- No cursor or `ExclusiveStartKey` behavior was visible in the repository scan.

Feature idea:

- Add cursor-based pagination to inventory, product types, archived items, and legacy product endpoints.
- Add server-side max limits.
- Remove or isolate legacy scan paths once migration is complete.

### 11. Security CI Pipeline

Priority: P1

Why it matters:

- Security checks should fail early before vulnerable dependencies or secrets reach main.

Evidence:

- `.github/workflows/ci-cd.yml` runs tests, e2e, lint, and build.
- No visible CodeQL, secret scan, `npm audit`, Docker image scan, or workflow permission hardening was found.

Feature idea:

- Add CodeQL.
- Add secret scanning.
- Add `npm audit --omit=dev` for runtime packages.
- Add Docker image scanning with Trivy or Grype.
- Set explicit GitHub Actions `permissions`.

### 12. Non-Mutating Lint In CI

Priority: P2

Why it matters:

- CI should report lint failures, not modify files.

Evidence:

- `backend/package.json` has `"lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"`.
- `.github/workflows/ci-cd.yml` runs `npm run lint`.

Feature idea:

- Split scripts into `lint` and `lint:fix`.
- Use non-mutating lint in CI.

### 13. Container Image Scanning And Pinning

Priority: P2

Why it matters:

- Base images can receive vulnerability disclosures after initial release.
- Tags like `node:22-alpine` can drift over time.

Evidence:

- `backend/Dockerfile` and `frontend/Dockerfile` use `FROM node:22-alpine`.
- Both run as `USER node`, which is good.

Feature idea:

- Add image scanning in CI.
- Consider digest pinning for production builds.
- Add a base-image update cadence.

### 14. Privacy Controls And Data Lifecycle

Priority: P1

Why it matters:

- PantryList stores intimate household inventory data.
- Future features like sharing, receipts, AI scans, price history, and monetization increase privacy impact.

Evidence:

- Secret scan returned `count: 0`.
- Current research files identify household inventory privacy risks.

Feature idea:

- Add account data export.
- Add account deletion.
- Add inventory deletion.
- Add retention policy for archived/deleted records.
- Add privacy review checklist for AI, receipt, sharing, and payment features.

### 15. Production Guardrails For CloudFront Origin

Priority: P1

Why it matters:

- Origin settings affect confidentiality and origin exposure.
- The CDK production stack can default the origin protocol policy to `http-only` if no context is passed.

Evidence:

- `infra/cognito/lib/pantrylist-production-stack.ts` reads `originProtocolPolicy` with fallback `"http-only"`.
- DynamoDB tables use AWS-managed encryption, PITR, and retain policy, which are good existing controls.

Feature idea:

- Fail closed for production if origin protocol policy is not explicitly set.
- Prefer HTTPS-only origin for production.
- Enforce origin verification header where applicable.
- Document operational validation for direct origin access.

## Positive Findings To Preserve

- Global Nest validation uses whitelist and forbid-non-whitelisted behavior.
- Backend Helmet is enabled by default.
- Swagger is disabled by default.
- Auth uses Cognito Hosted UI instead of local password storage.
- Cookies use `HttpOnly` for access and refresh tokens.
- XSRF token validation exists for mutating requests.
- Docker runtime containers run as `USER node`.
- DynamoDB tables use point-in-time recovery and AWS-managed encryption in the production stack.
- Local secret scan returned `count: 0`.

## Recommended First Implementation Batch

1. Upgrade vulnerable dependencies, especially Angular SSR.
2. Add SCA, secret scan, and container scan to CI.
3. Add rate limiting to backend and SSR proxy.
4. Add SSR/CloudFront security headers.
5. Add domain error normalization.
6. Add observability baseline.

## Notes

This file is a backlog source. Each item should become its own implementation spec before code changes begin.
