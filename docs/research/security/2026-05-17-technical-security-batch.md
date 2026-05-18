# Technical Security Batch

Date: 2026-05-17

Status: Implementation evidence for the security and technical hardening batch.

## Scope

Trust boundaries covered:

- Browser to SSR frontend.
- SSR frontend to backend API proxy.
- Backend API to Cognito and data stores.
- CI/CD to production deploy smoke.
- CloudFront to production origin.

Sensitive data in scope:

- Cognito session cookies and refresh tokens.
- XSRF token.
- Household inventory and profile preferences.
- Infrastructure context for CloudFront origin routing.

## Threat Model

| Abuse case | Impact | Mitigation in this batch |
| --- | --- | --- |
| CI action runtime drift breaks deploys | Production deploy path stops validating after GitHub runtime changes | Upgraded `checkout` and `setup-node`, enabled Node 24 opt-in, replaced Node 20 gitleaks action with CLI |
| Secret or vulnerable dependency reaches main | Credential exposure or known exploit ships | Runtime audits, gitleaks CLI scan, CodeQL, Trivy scans, explicit workflow permissions |
| SSR proxy forwards unsafe headers or hangs on backend | Header confusion, stale cached auth/API responses, resource exhaustion | Header sanitization, request ID forwarding, `no-store`, proxy timeout and 504 response |
| Browser session is exposed to common web attacks | Clickjacking, MIME sniffing, weak referrer policy, loose CSP | SSR CSP/security headers, production HSTS, CloudFront response headers policy |
| Logout leaves refresh token valid | Stolen refresh token remains useful after local logout | Cognito refresh token revocation on API and browser logout paths |
| Domain errors leak as 500s | User mistakes look like server faults and logs become noisy | Global API exception filter maps known domain validation failures to 400 and sanitizes 500s |
| Production incidents lack correlation | Hard to trace auth/proxy/API failures | Backend request IDs and structured request rejection/error logs |
| Origin config defaults to insecure transport | CloudFront could be synthesized with HTTP origin accidentally | Production stack now requires explicit `originProtocolPolicy`; HTTP-only requires explicit exception |

## Control Checklist

- AuthN/AuthZ: Cognito remains the identity provider; logout now attempts refresh token revocation before clearing local cookies.
- Session defense: HttpOnly access/refresh cookies remain; XSRF validation remains for mutating API logout/refresh flows.
- Browser headers: SSR now emits CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and production HSTS.
- Edge headers: CloudFront production stack now defines a matching response headers policy.
- API proxy: `/api` proxy has rate limiting, JSON body limit, header sanitization, generated `x-request-id`, timeout, and `Cache-Control: no-store`.
- Error handling: Global backend filter normalizes `HttpException`, known domain validation errors, and unexpected errors.
- Observability: Backend adds `x-request-id` to requests/responses and logs request rejections/errors with request id.
- CI/CD: Workflow uses Node 24-capable core actions, CodeQL, gitleaks CLI, npm audit, Trivy, explicit job permissions, and production smoke.
- Origin guardrails: CDK production stack fails synthesis if `originProtocolPolicy` is missing or insecure without explicit override.

## Evidence

Local checks run on 2026-05-17:

- `backend`: `npm audit --json` returned `total: 0`.
- `frontend`: `npm audit --json` returned `total: 0`.
- `infra/cognito`: `npm audit --json` returned `total: 0`.
- Local secret scan output: `Output/secret-scan-technical-batch.json` returned `count: 0`.
- `backend`: `npm run lint:check` passed.
- `backend`: `npm run build` passed.
- `backend`: `npm run test` passed, 116 tests.
- `backend`: `npm run test:e2e` passed, 2 tests.
- `frontend`: `npm run test:ci` passed, 59 tests.
- `frontend`: `npm run build` passed.
- `infra/cognito`: `npm run build` passed.
- `git diff --check` passed.
- Built SSR server on `localhost:4101` returned CSP, HSTS, frame, referrer, permissions, and `nosniff` headers on `/healthz` and `/login/`.
- Built SSR `/api/healthz` proxy returned backend `ok` with `Cache-Control: no-store`.
- Local Chrome/Playwright smoke against built SSR `/login/` returned `hasLogin: true` and `errorCount: 0`.

## Follow-Up

- Validate CodeQL and gitleaks CLI in GitHub Actions after push.
- If CloudFront stack is deployed, pass explicit `originProtocolPolicy=https-only` unless a documented exception is approved.
- Add alerting destination once logs/metrics backend is chosen.
