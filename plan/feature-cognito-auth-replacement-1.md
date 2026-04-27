---
goal: Replace PantryList Local Authentication With Cognito
version: 1.0
date_created: 2026-04-27
last_updated: 2026-04-27
owner: Codex
status: Completed
tags: [feature, auth, cognito, security, angular, nestjs]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan replaces PantryList local email/password authentication with Amazon
Cognito Hosted UI and Cognito-issued tokens. PantryList keeps local `users` only
for application profile, authorization status, and pantry ownership.

## 1. Requirements & Constraints

- **REQ-001**: Cognito must become the single authentication authority.
- **REQ-002**: PantryList must stop registering, verifying, resetting, and
  storing local passwords in the active authentication path.
- **REQ-003**: PantryList must stop issuing local JWT access and refresh tokens
  in the active authentication path.
- **REQ-004**: `User.id` must equal the verified Cognito `sub` claim.
- **REQ-005**: `email` must be required from verified Cognito claims.
- **REQ-006**: The Angular login UI must start Cognito Hosted UI redirects
  through the backend.
- **REQ-007**: The backend must support provider-specific login redirects for
  allowed providers such as `Google` and `Facebook`.
- **REQ-008**: Session bootstrap must continue to expose `/api/auth/me` to the
  Angular app.
- **SEC-001**: Use Authorization Code flow with PKCE `S256`.
- **SEC-002**: Validate callback `state` before token exchange.
- **SEC-003**: Validate `nonce` from the ID token after token exchange.
- **SEC-004**: Verify Cognito access tokens using `aws-jwt-verify`, issuer/user
  pool, token use, expiry, and client id.
- **SEC-005**: Store Cognito access and refresh tokens only in HttpOnly cookies.
- **SEC-006**: Keep XSRF enforcement for mutating authenticated API requests.
- **SEC-007**: Reject providers not present in `COGNITO_ALLOWED_PROVIDERS`.
- **CON-001**: Do not create AWS infrastructure in this plan.
- **CON-002**: Do not preserve local password fallback behavior.
- **CON-003**: Do not require a real Cognito User Pool for unit tests.
- **CON-004**: Full browser social-login testing requires external AWS/Cognito
  configuration and is out of scope until env vars exist.
- **PAT-001**: Keep the backend hexagonal style with ports in
  `backend/src/application/ports`.
- **PAT-002**: Keep Angular auth state in NgRx and pantry data reset on session
  end.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Add Cognito backend ports, config, and token/profile tests.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Install `aws-jwt-verify` in `backend/package.json` and `backend/package-lock.json`. | Yes | 2026-04-27 |
| TASK-002 | Add Cognito symbols to `backend/src/application/tokens.ts`: `COGNITO_AUTH_URL_BUILDER`, `COGNITO_TOKEN_CLIENT`, and `COGNITO_TOKEN_VERIFIER`. | Yes | 2026-04-27 |
| TASK-003 | Add `backend/src/application/ports/cognito-auth.port.ts` defining authorization URL input/output, token exchange input/output, refresh input/output, verified token claims, and verifier interfaces. | Yes | 2026-04-27 |
| TASK-004 | Add `backend/src/application/services/cognito-auth-transaction.service.ts` with pure functions for `state`, `nonce`, PKCE verifier/challenge generation, redirect validation, and provider allowlist checks. | Yes | 2026-04-27 |
| TASK-005 | Add tests in `backend/src/application/services/cognito-auth-transaction.service.spec.ts` for PKCE `S256`, provider allowlist rejection, safe relative redirects, and unsafe external redirects. | Yes | 2026-04-27 |
| TASK-006 | Add `backend/src/application/services/cognito-profile-sync.service.ts` to upsert local `User` records by Cognito `sub`, require email, derive username, and handle username collisions with a stable suffix. | Yes | 2026-04-27 |
| TASK-007 | Add tests in `backend/src/application/services/cognito-profile-sync.service.spec.ts` for new profile creation, existing profile update, missing email rejection, disabled user preservation, and username collision suffixing. | Yes | 2026-04-27 |

### Implementation Phase 2

- GOAL-002: Add backend Cognito HTTP flow and replace the active guard.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Extend backend config validation in `backend/src/app.module.ts` for `COGNITO_ENABLED`, `COGNITO_ISSUER`, `COGNITO_DOMAIN`, `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET`, `COGNITO_REDIRECT_URI`, `COGNITO_LOGOUT_REDIRECT_URI`, `COGNITO_SCOPES`, `COGNITO_ALLOWED_PROVIDERS`, and `COGNITO_AUTH_TRANSACTION_TTL_SECONDS`. | Yes | 2026-04-27 |
| TASK-009 | Add `backend/src/infrastructure/auth/cognito/cognito-auth-url-builder.service.ts` to build Hosted UI authorize and logout URLs. | Yes | 2026-04-27 |
| TASK-010 | Add `backend/src/infrastructure/auth/cognito/cognito-token-client.service.ts` to call `/oauth2/token` with `application/x-www-form-urlencoded` for authorization-code and refresh-token grants. | Yes | 2026-04-27 |
| TASK-011 | Add `backend/src/infrastructure/auth/cognito/cognito-token-verifier.service.ts` using `CognitoJwtVerifier` from `aws-jwt-verify`. | Yes | 2026-04-27 |
| TASK-012 | Extend `backend/src/infrastructure/http/auth/auth-cookie.service.ts` to set Cognito token cookies, set short-lived auth transaction cookies, read/clear transaction cookies, and return XSRF tokens without local JWT session types. | Yes | 2026-04-27 |
| TASK-013 | Replace `backend/src/infrastructure/http/controllers/auth.controller.ts` local password endpoints with Cognito login, callback, me, refresh, and logout endpoints. | Yes | 2026-04-27 |
| TASK-014 | Change `backend/src/infrastructure/http/auth/access-token.guard.ts` to verify Cognito access tokens and resolve local users by Cognito `sub`. | Yes | 2026-04-27 |
| TASK-015 | Remove local auth providers from the active `AppModule` graph while leaving obsolete persistence classes untouched for future cleanup. | Yes | 2026-04-27 |

### Implementation Phase 3

- GOAL-003: Replace Angular local auth screens and state with Cognito redirects.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Update `frontend/src/app/core/services/auth-api.service.ts` to remove local password methods, expose Cognito login URL helpers, keep `bootstrapCurrentUser`, `refreshSession`, `logout`, and normalize logout redirect responses. | Yes | 2026-04-27 |
| TASK-017 | Update `frontend/src/app/store/auth/auth.actions.ts`, `auth.effects.ts`, and related reducer/selectors to remove register/password/claim flows and start Cognito redirects from login actions. | Yes | 2026-04-27 |
| TASK-018 | Replace `frontend/src/app/features/auth/login-page.component.*` with Cognito provider buttons and configuration-error states. | Yes | 2026-04-27 |
| TASK-019 | Remove or redirect active routes for register, forgot password, reset password, and claim imported account in `frontend/src/app/app-routing.module.ts`. | Yes | 2026-04-27 |
| TASK-020 | Update Angular auth tests to verify Cognito redirect behavior, session bootstrap, logout redirect, and pantry reset on session end. | Yes | 2026-04-27 |

### Implementation Phase 4

- GOAL-004: Verify, document, and keep local runtime behavior explicit.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | Update `.env.docker.example`, `.env.production.example`, README, and Dokploy docs with Cognito env vars and localhost callback guidance. | Yes | 2026-04-27 |
| TASK-022 | Run backend focused tests after each RED/GREEN cycle, then backend lint, unit tests, e2e tests, and build. | Yes | 2026-04-27 |
| TASK-023 | Run frontend tests, build, and E2E smoke where Cognito is mocked or explicitly skipped due missing real AWS config. | Yes | 2026-04-27 |
| TASK-024 | Run production dependency audits for backend and frontend. | Yes | 2026-04-27 |
| TASK-025 | Update `task_plan.md`, `findings.md`, and `progress.md` with exact implementation and verification results. | Yes | 2026-04-27 |

## 3. Alternatives

- **ALT-001**: Keep local password fallback until Cognito is configured.
  Rejected because two auth authorities would undermine recovery, revocation,
  and provider linking.
- **ALT-002**: Use Amplify Auth directly in Angular. Rejected for this plan
  because HttpOnly server cookies better protect tokens from XSS and preserve
  the current backend authorization boundary.
- **ALT-003**: Hand-roll JWKS verification. Rejected because AWS recommends
  `aws-jwt-verify` for Node token verification.

## 4. Dependencies

- **DEP-001**: `aws-jwt-verify` backend dependency.
- **DEP-002**: Existing NestJS/Fastify backend.
- **DEP-003**: Existing `AuthCookieService` for HttpOnly cookies and XSRF.
- **DEP-004**: Existing MongoDB `users` collection and `MongoUserDao`.
- **DEP-005**: Existing Angular NgRx auth store.
- **DEP-006**: External Cognito User Pool configuration for real social-login
  browser testing.

## 5. Files

- **FILE-001**: `backend/package.json`
- **FILE-002**: `backend/package-lock.json`
- **FILE-003**: `backend/src/application/tokens.ts`
- **FILE-004**: `backend/src/application/ports/cognito-auth.port.ts`
- **FILE-005**: `backend/src/application/services/cognito-auth-transaction.service.ts`
- **FILE-006**: `backend/src/application/services/cognito-profile-sync.service.ts`
- **FILE-007**: `backend/src/infrastructure/auth/cognito/*.ts`
- **FILE-008**: `backend/src/infrastructure/http/auth/auth-cookie.service.ts`
- **FILE-009**: `backend/src/infrastructure/http/auth/access-token.guard.ts`
- **FILE-010**: `backend/src/infrastructure/http/controllers/auth.controller.ts`
- **FILE-011**: `backend/src/app.module.ts`
- **FILE-012**: `frontend/src/app/core/services/auth-api.service.ts`
- **FILE-013**: `frontend/src/app/store/auth/*`
- **FILE-014**: `frontend/src/app/features/auth/login-page.component.*`
- **FILE-015**: `frontend/src/app/app-routing.module.ts`
- **FILE-016**: `.env.docker.example`
- **FILE-017**: `.env.production.example`
- **FILE-018**: `README.md`
- **FILE-019**: `docs/deployment/dokploy.md`
- **FILE-020**: `task_plan.md`, `findings.md`, and `progress.md`

## 6. Testing

- **TEST-001**: Backend PKCE generation produces an `S256` code challenge.
- **TEST-002**: Backend provider allowlist rejects disallowed provider names.
- **TEST-003**: Backend redirect normalization rejects external and protocol
  relative redirects.
- **TEST-004**: Backend profile sync creates a local user using Cognito `sub`.
- **TEST-005**: Backend profile sync updates email/name without changing app
  disabled status.
- **TEST-006**: Backend callback rejects state mismatch before token exchange.
- **TEST-007**: Backend callback rejects missing email claims.
- **TEST-008**: Access guard rejects missing/invalid Cognito access tokens.
- **TEST-009**: Access guard accepts valid Cognito access tokens and enforces
  XSRF on mutating requests.
- **TEST-010**: Angular login page starts Cognito redirect instead of local
  password submit.
- **TEST-011**: Angular auth bootstrap still loads `/api/auth/me`.
- **TEST-012**: Angular logout clears state and navigates to backend-provided
  Cognito logout URL.

## 7. Risks & Assumptions

- **RISK-001**: Real Google/Facebook testing cannot complete until AWS Cognito
  user pool, app client, domain, callback URLs, and provider secrets exist.
- **RISK-002**: Existing local dev users cannot sign in after local password
  flows are removed.
- **RISK-003**: Cookie settings must be revisited if frontend and backend are
  deployed on separate domains.
- **RISK-004**: Cognito account linking can create duplicate users if provider
  linking is configured incorrectly in AWS.
- **ASSUMPTION-001**: Local pantry data can be recreated because the app is not
  deployed to production yet.
- **ASSUMPTION-002**: `http://localhost:48673/api/auth/cognito/callback` is the
  first local callback URL for manual Cognito testing through the existing
  frontend proxy.

## 8. Related Specifications / Further Reading

- `docs/superpowers/specs/2026-04-27-cognito-auth-replacement-design.md`
- AWS Cognito social IdP guide:
  <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html>
- AWS Cognito authorization endpoint:
  <https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html>
- AWS Cognito token endpoint:
  <https://docs.aws.amazon.com/cognito/latest/developerguide/token-endpoint.html>
- AWS Cognito PKCE guide:
  <https://docs.aws.amazon.com/cognito/latest/developerguide/using-pkce-in-authorization-code.html>
- AWS Cognito JWT verification guide:
  <https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html>
