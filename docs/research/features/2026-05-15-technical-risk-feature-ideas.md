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

Status note:

- Cognito global sign-out is implemented through the profile page and `DELETE /profile/sessions`, with exact confirmation text and local session cookie clearing. A true session/device list remains pending because the current Cognito flow does not expose a simple active-device inventory.

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

Status note:

- Optional software-token MFA is available through CDK context `mfaConfiguration=OPTIONAL` or `ON`.
- Step-up checks are implemented for destructive profile actions when `AUTH_STEP_UP_ENABLED=true` and the Cognito access token includes a fresh `auth_time`.
- The default remains non-blocking until MFA/step-up rollout is explicitly enabled and manually verified in production.

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

Status note:

- Request IDs and safe operation logs are partially implemented for key pantry, household, sharing, and checkout flows.
- A protected in-memory `/api/metrics` snapshot is implemented when `METRICS_ACCESS_TOKEN` is configured.
- External metrics sinks, durable alert delivery, and external error reporting remain pending.

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

Status note:

- Current export/profile metadata exposes explicit query limits, and repository paths use bounded constants for several reads.
- Archived pantry reads now support cursor pagination and export/profile metadata exposes the archived page size.
- Active pantry overview reads and legacy product reads still need cursor pagination if volume starts stressing bounded query paths.

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

Status note:

- Implemented in CI by the technical trust batch: CodeQL, gitleaks secret scan, runtime dependency audits, Trivy image scans, and explicit workflow permissions.

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

Status note:

- Backend CI now uses `npm run lint:check`, while `npm run lint` remains the local fixing command.

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

Status note:

- Trivy image scanning is implemented in CI for backend and frontend images.
- Backend and frontend Dockerfiles are pinned to the current `node:22-alpine` digest, and a weekly workflow checks whether the base-image digest drifted.

### 14. GitHub Actions Node Runtime Migration

Priority: P2

Why it matters:

- CI/CD should keep working when GitHub changes the default JavaScript action runtime.
- The production deploy path depends on the `production-smoke` workflow after Dokploy auto deploy.

Evidence:

- On 2026-05-17, GitHub Actions run `26000863367` completed successfully but emitted a warning that Node.js 20 actions are deprecated.
- The warning said GitHub Actions will force JavaScript actions to Node.js 24 by default starting 2026-06-02.
- The warning said Node.js 20 will be removed from the runner on 2026-09-16.
- Affected actions in the warning included `actions/checkout@v4` and `gitleaks/gitleaks-action@v2`.

Feature idea:

- Upgrade affected workflow actions to versions that support Node.js 24.
- Consider setting `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` in CI to test the migration before GitHub changes the default.
- Keep `production-smoke` green after the action runtime migration.

Status note:

- CI now uses Node 24-compatible major versions for the visible GitHub Actions and sets `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`.

### 15. Privacy Controls And Data Lifecycle

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

Status note:

- Account data export, inventory deletion, Cognito-aware account deletion, retention policy metadata, optional archived-record TTL fields, and privacy checklist gate are implemented.
- Archived auto-delete remains off by default and should not be enabled until the product decision and backfill/migration behavior are reviewed.

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

Status note:

- Production CloudFront origin verification header, scoped SSM parameter access, and HTTPS-only synth validation are implemented. Keep direct-origin validation in the deploy/audit checklist after CloudFront or Dokploy changes.

### 16. Serverless Microservice Backend Migration

Priority: P0

Why it matters:

- The current backend is a Nest monolith, which is practical for product iteration but can become harder to scale, deploy independently, and isolate by domain as the app adds households, payments, AI/OCR, notifications, and background workflows.
- Future AWS-native growth should support clear service boundaries, async workflows, and environment isolation.
- Production is now serverless, but API Gateway still routes all backend traffic to one Lambda. The next architecture priority is splitting that Lambda by domain/service without reintroducing EC2.

Evidence:

- The current repository has a single backend application under `backend/` and AWS infrastructure under `infra/cognito/`.
- Production runs through CloudFront, API Gateway, one app Lambda, Cognito, S3, and DynamoDB. The EC2 path for this app has been decommissioned.

Feature idea:

- Create a deliberate migration plan from the Nest monolith to AWS serverless microservices.
- Use AWS Lambda for route/domain services, Step Functions for orchestrated workflows, and supporting AWS services as needed, such as API Gateway, EventBridge/SQS, DynamoDB, CloudWatch, IAM, and CDK.
- Support three isolated environments from the start: dev, test, and production.
- Preserve external API contracts during migration through a strangler-style rollout where feasible.
- Keep the monolith or a stable compatibility path available during rollout until production traffic is verified on the new services.
- Define rollback, observability, cost controls, secrets management, and data migration strategy before implementing route splits.

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

## Recommended Next Technical Batch

1. Serverless microservice migration discovery for the current one-Lambda backend.
2. Full session/device list beyond Cognito global sign-out.
3. External metrics sink and alert delivery for the protected metrics snapshot.
4. Cursor pagination for active pantry overview and legacy product reads if production data volume requires it.
5. Direct-origin validation checklist after CloudFront changes.

## Notes

This file is a backlog source. Each item should become its own implementation spec before code changes begin.
