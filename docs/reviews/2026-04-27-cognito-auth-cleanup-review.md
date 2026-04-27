# Cognito Auth Cleanup Review

Reviewed: 2026-04-27 Central Time

Scope: cleanup after Cognito became the active authentication authority.

## Review Summary

| Area | Result |
|------|--------|
| Backend local password auth | Removed inactive use cases, session service, password/JWT/token ports, local auth DAOs, local auth schemas, and password/JWT infrastructure adapters. |
| Frontend local auth | Removed inactive register, forgot password, reset password, claim imported account screens, actions, state fields, selectors, and facade methods. |
| Dependencies | Removed unused `@nestjs/jwt` and `argon2` from backend dependencies. |
| Runtime behavior | Cognito login/me/refresh/logout behavior remains the only active auth path. |
| Historical docs | Preserved historical specs so prior decisions remain explainable. |

## Security Review

| Abuse case | Impact | Mitigation |
|------------|--------|------------|
| Local password fallback accidentally re-enabled | Split auth authority and weaker account recovery semantics | Removed inactive local auth providers, use cases, frontend actions, and dependencies. |
| Stale JWT env vars mistaken as required secrets | Operators configure dead secrets and misunderstand active auth | Removed `JWT_*` validation and replaced cookie TTL env names with `AUTH_*` names. |
| Dormant reset/claim endpoints revived by future routing | Unexpected local password or legacy-claim flow exposure | Deleted inactive controller-adjacent frontend routes/components and backend local auth use cases. |
| Secret leakage during cleanup verification | Local paths/secrets committed by accident | Secret scan returned `count = 0`; generated JSON was deleted because it contained an absolute local path. |
| Regression in Cognito guard/cookies | Users lose access or stale cookies produce server errors | Backend tests, e2e, HTTP stale-cookie smoke, and Cognito-disabled smoke passed. |

## Evidence

| Check | Result |
|-------|--------|
| Backend lint | Passed |
| Backend unit tests | 17 suites passed, 47 tests passed |
| Backend build | Passed |
| Backend e2e | 1 suite passed, 2 tests passed |
| Frontend tests | `TOTAL: 17 SUCCESS` |
| Frontend build | Passed |
| Frontend E2E | 1 Playwright test passed |
| Backend production audit | `total = 0` vulnerabilities |
| Frontend production audit | `total = 0` vulnerabilities |
| Compose config | Development and production configs passed |
| Local HTTP smoke | backend health `200`, frontend login `200`, stale local JWT `401`, Cognito disabled login `503` |
| Secret scan | JSON output had `count = 0` and `findings = []` |

## Residual Follow-Up

- If imported legacy pantry ownership must be claimed in the future, design a
  Cognito-native claim flow instead of restoring local password claims.
- Full Google/Facebook login still needs real Cognito User Pool and provider
  configuration outside git.
