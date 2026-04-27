# Cognito Auth Replacement Comprehensive Review

Reviewed: 2026-04-27 14:49 Central Time

Scope: backend auth replacement, Angular auth launch flow, Docker/env docs, and
local verification for Cognito Hosted UI integration.

GitHub artifact status: not posted. There is no confirmed GitHub issue target
for this local feature pass, and remote comments require an explicit dry-run
confirmation before posting.

## Seven-Criteria Review

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | Blindspots | Pass with known residuals | Real Google/Facebook login still requires external Cognito config; local smoke only verifies fail-closed and stubbed redirect behavior. |
| 2 | Clarity/Consistency | Pass | Backend Cognito boundaries are separated into application ports, transaction/profile services, infrastructure services, guard, cookies, and controller. |
| 3 | Maintainability | Pass with cleanup follow-up | Obsolete local auth classes/components remain for future cleanup but are removed from active backend providers and frontend routes. |
| 4 | Security | Pass | Uses Hosted UI, PKCE `S256`, state, nonce, HttpOnly token cookies, XSRF for mutating requests, provider allowlist, and `aws-jwt-verify`. |
| 5 | Performance | Pass | Auth changes add only one Cognito token exchange/refresh call per auth lifecycle and one local user lookup per guarded request. |
| 6 | Documentation | Pass | README, env examples, Dokploy docs, findings, progress, and implementation plan were updated. |
| 7 | Standards/Style | Pass | Backend lint, tests, build, frontend tests/build/E2E, Compose config, audits, and secret scan passed. |

## Threat Model

| Abuse case | Impact | Mitigation |
|------------|--------|------------|
| Forged or stale access token cookie | Unauthorized pantry access or server error leakage | `AccessTokenGuard` verifies Cognito access tokens and converts verifier failures into `401 Unauthorized`. |
| Callback replay or CSRF | Attacker completes login with a different auth transaction | Short-lived HttpOnly transaction cookies plus `state` validation before token exchange. |
| ID token substitution | User profile sync against the wrong auth transaction | Callback verifies Cognito ID token and checks `nonce` before syncing the local profile. |
| Open redirect after login | User redirected to an attacker-controlled origin | Redirect target is normalized to safe relative paths and rejects external/protocol-relative URLs. |
| Provider or secret misuse | Login through unintended provider or leaked client/provider secrets | Provider allowlist is enforced; secrets are documented as deployment-only and excluded from tracked examples. |

## Evidence

| Evidence | Result |
|----------|--------|
| `npm run lint` in `backend/` | Passed |
| `npx jest --runInBand` in `backend/` | 18 suites passed, 50 tests passed |
| `npm run build` in `backend/` | Passed |
| `npm run test:e2e` in `backend/` | 1 suite passed, 2 tests passed |
| `npm run test:ci` in `frontend/` | `TOTAL: 17 SUCCESS` |
| `npm run build` in `frontend/` | Passed |
| `$env:E2E_BASE_URL='http://localhost:48673'; npm run test:e2e` in `frontend/` | 1 Playwright test passed |
| `npm audit --omit=dev --json` in `backend/` | `total = 0` vulnerabilities |
| `npm audit --omit=dev --json` in `frontend/` | `total = 0` vulnerabilities |
| Development and production Compose config checks | Passed |
| Local HTTP smoke | backend health `200`, frontend login `200`, Cognito disabled login `503`, stale local JWT cookie `401` |
| Secret scan | JSON output had `count = 0` and `findings = []` |

## Residual Risks

- Real social login is not fully validated until an AWS Cognito User Pool,
  Hosted UI domain, app client, callback/logout URLs, Google/Facebook IdPs, and
  provider secrets are configured outside git.
- Obsolete local auth source files still exist. They are inactive, but a future
  cleanup should delete them once Cognito is fully configured and manually
  validated.
- Cookie settings should be rechecked if frontend and backend are deployed on
  separate domains instead of the same-origin SSR proxy shape.
