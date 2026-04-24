---
goal: PantryList auth, DAO, and production deployment implementation plan
version: 1.0
date_created: 2026-04-23
last_updated: 2026-04-23
owner: Codex
status: In progress
tags: [feature, architecture, auth, migration, infrastructure]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

This plan implements the approved auth, DAO, migration, and deployment design
for PantryList. The goal is to replace client-supplied identity with real
PantryList accounts, introduce DAO boundaries for persistence, migrate legacy
ownership safely, and harden Docker and Dokploy runtime behavior.

## 1. Requirements & Constraints

- **REQ-001**: Implement PantryList-owned accounts with required unique `email`
  and required unique `username`.
- **REQ-002**: Replace frontend local-storage auth with backend-backed session
  auth.
- **REQ-003**: Stop accepting `userId` from frontend query strings and request
  bodies on pantry APIs.
- **REQ-004**: Keep existing pantry, lot, and product-type data without
  inventing fake email addresses.
- **REQ-005**: Support NgRx-based auth session state in Angular.
- **REQ-006**: Support password recovery and legacy account claim flows.
- **REQ-007**: Keep a DAO boundary between use cases and persistence.
- **SEC-001**: Hash passwords with `Argon2id`.
- **SEC-002**: Use access JWT plus rotating refresh sessions in `HttpOnly`
  cookies.
- **SEC-003**: Store refresh tokens and password reset tokens only as hashes.
- **SEC-004**: Add XSRF protection for authenticated mutating browser requests.
- **SEC-005**: Harden legacy `/api/products` ownership checks.
- **CON-001**: Do not revert unrelated existing worktree changes.
- **CON-002**: Keep MongoDB as the first persistence implementation, but do not
  couple use cases directly to Mongoose.
- **CON-003**: Keep development and production Docker behavior separate.
- **PAT-001**: Follow the existing domain/application/infrastructure layering.
- **PAT-002**: Prefer additive migrations and compatibility cuts before cleanup.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Introduce the auth and persistence foundation in the backend.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add backend runtime dependencies for auth, password hashing, cookie handling, and test support in `backend/package.json`. | | |
| TASK-002 | Add DAO tokens for `UserDao`, `PasswordCredentialDao`, `RefreshSessionDao`, `PasswordResetTokenDao`, `LegacyAccountClaimDao`, and supporting auth services in `backend/src/application/tokens.ts`. | | |
| TASK-003 | Add domain entities and value objects for `User`, `PasswordCredential`, `RefreshSession`, `PasswordResetToken`, and `LegacyAccountClaim` under `backend/src/domain/`. | | |
| TASK-004 | Add DAO interfaces under `backend/src/domain/repositories/` for auth and legacy claim persistence. | | |
| TASK-005 | Add Mongo schemas and DAO adapters under `backend/src/infrastructure/database/mongodb/` for the new auth and legacy claim models. | | |
| TASK-006 | Update `backend/src/app.module.ts` to register the new schemas, DAO providers, and auth-related services. | | |

### Implementation Phase 2

- **GOAL-002**: Implement auth, claim, and recovery use cases plus HTTP integration.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Add auth application services for password hashing, JWT signing, token hashing, cookie generation, and current-user resolution under `backend/src/application/`. | | |
| TASK-008 | Implement use cases for register, login, logout, refresh, me, forgot password, reset password, and claim imported account under `backend/src/application/use-cases/`. | | |
| TASK-009 | Add Fastify cookie support, XSRF support, and auth configuration wiring in `backend/src/app.setup.ts` and related config paths. | | |
| TASK-010 | Add HTTP DTOs, controllers, decorators, and guards for `/api/auth/*` under `backend/src/infrastructure/http/`. | | |
| TASK-011 | Replace query/body `userId` usage in pantry and legacy product controllers with authenticated current-user extraction. | | |
| TASK-012 | Harden legacy `/api/products/:id` and `/api/products/:id/quantity` ownership validation in application use cases and repositories. | | |

### Implementation Phase 3

- **GOAL-003**: Add legacy ownership migration and claim support.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Add migration support for `LegacyAccountClaim` records by scanning distinct owner strings in `products`, `product_types`, and `inventory_lots`. | | |
| TASK-014 | Add a claim-time reassignment workflow that bulk-updates pantry ownership from legacy usernames to real `user.id` values. | | |
| TASK-015 | Document migration commands, assumptions, and rollback notes in `README.md` and/or project docs. | | |

### Implementation Phase 4

- **GOAL-004**: Replace frontend local auth with NgRx-backed real session flows.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Add Angular auth models, actions, reducer, selectors, and effects under `frontend/src/app/store/auth/`. | | |
| TASK-017 | Replace `SessionService` with `AuthApiService` and `AuthFacade` in `frontend/src/app/core/services/`. | | |
| TASK-018 | Update `LoginPageComponent`, routing, and guards to use backend-backed session state. | | |
| TASK-019 | Add first-pass UI flows for register, forgot password, reset password, and claim imported account under `frontend/src/app/features/auth/`. | | |
| TASK-020 | Remove `userId` arguments from pantry/product frontend services and adjust effects/components to rely on authenticated user state. | | |
| TASK-021 | Ensure app bootstrap calls `/api/auth/me` before protected routing decisions. | | |

### Implementation Phase 5

- **GOAL-005**: Harden Docker and Dokploy runtime posture.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-022 | Add `backend/.dockerignore` and `frontend/.dockerignore` to exclude secrets, node_modules, and build artifacts. | | |
| TASK-023 | Convert `backend/Dockerfile` to a multi-stage production image with non-root runtime and health support. | | |
| TASK-024 | Convert `frontend/Dockerfile` to a multi-stage Angular SSR production image that runs `node dist/frontend/server/server.mjs`. | | |
| TASK-025 | Split development and production compose/runtime concerns so local watch mode does not leak into Dokploy. | | |
| TASK-026 | Add health endpoints and compose healthchecks for backend and frontend runtime verification. | | |

### Implementation Phase 6

- **GOAL-006**: Verify behavior and close documentation gaps.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-027 | Add backend unit and e2e tests for register, login, me, refresh, logout, reset password, claim imported account, and ownership enforcement. | | |
| TASK-028 | Add frontend reducer/effect/guard/component tests for auth flows and pantry session bootstrap. | | |
| TASK-029 | Run lint, tests, build, container builds, and runtime smoke verification for the authenticated stack. | | |
| TASK-030 | Update `README.md`, `progress.md`, `findings.md`, and `C:\\Users\\lince\\Documents\\GitHub\\Codex\\Codex.md` with the final implementation state and residual risks. | | |

## 3. Alternatives

- **ALT-001**: Keep frontend-managed username sessions. Rejected because it
  preserves the current client-supplied-identity security gap.
- **ALT-002**: Use bearer tokens in `localStorage`. Rejected because browser
  JS would directly handle long-lived auth material and the stack already fits
  same-origin cookies better.
- **ALT-003**: Auto-create fake accounts for legacy usernames with invented
  emails. Rejected because it fabricates user identity data and complicates
  recovery flows.
- **ALT-004**: Couple use cases directly to Mongo models. Rejected because the
  user explicitly wants easier future database portability.

## 4. Dependencies

- **DEP-001**: `argon2` for password hashing.
- **DEP-002**: `@fastify/cookie` for cookie support in Nest Fastify.
- **DEP-003**: JWT signing library and related Nest integration for access and
  refresh token creation.
- **DEP-004**: Existing Angular NgRx store setup in `frontend/src/app/store/`.
- **DEP-005**: Existing MongoDB runtime and collections already used by the
  pantry domain.

## 5. Files

- **FILE-001**: `backend/package.json`
- **FILE-002**: `backend/src/app.module.ts`
- **FILE-003**: `backend/src/app.setup.ts`
- **FILE-004**: `backend/src/application/tokens.ts`
- **FILE-005**: `backend/src/domain/**`
- **FILE-006**: `backend/src/infrastructure/database/mongodb/**`
- **FILE-007**: `backend/src/infrastructure/http/**`
- **FILE-008**: `backend/test/**`
- **FILE-009**: `backend/scripts/**`
- **FILE-010**: `frontend/src/app/core/services/**`
- **FILE-011**: `frontend/src/app/core/guards/**`
- **FILE-012**: `frontend/src/app/features/auth/**`
- **FILE-013**: `frontend/src/app/features/pantry/**`
- **FILE-014**: `frontend/src/app/store/auth/**`
- **FILE-015**: `frontend/src/app/store/pantry/**`
- **FILE-016**: `frontend/src/app/app-routing.module.ts`
- **FILE-017**: `frontend/src/app/app.module.ts`
- **FILE-018**: `frontend/src/server.ts`
- **FILE-019**: `docker-compose.yml`
- **FILE-020**: `backend/Dockerfile`
- **FILE-021**: `frontend/Dockerfile`
- **FILE-022**: `README.md`

## 6. Testing

- **TEST-001**: Register creates a real user account and starts a session.
- **TEST-002**: Login rejects invalid credentials with a generic error.
- **TEST-003**: Refresh rotates refresh sessions and rejects replay.
- **TEST-004**: Logout clears cookies and revokes the active session.
- **TEST-005**: Forgot password returns a generic response.
- **TEST-006**: Reset password replaces the stored hash and revokes old
  sessions.
- **TEST-007**: Claim imported account migrates legacy pantry ownership to
  `user.id`.
- **TEST-008**: Pantry and legacy product endpoints no longer accept caller
  `userId` and enforce ownership from auth context.
- **TEST-009**: Angular auth bootstrap restores session state from `/api/auth/me`.
- **TEST-010**: Angular pantry requests no longer send `userId`.
- **TEST-011**: Backend and frontend production images build successfully.
- **TEST-012**: Containerized authenticated smoke flow works through frontend
  SSR and backend API.

## 7. Risks & Assumptions

- **RISK-001**: The current worktree is already heavily modified; implementation
  must avoid overwriting unrelated in-progress work.
- **RISK-002**: Legacy ownership reassignment can be destructive if the mapping
  is wrong; migration code must be idempotent and auditable.
- **RISK-003**: Cookie auth and XSRF protection can fail subtly if same-origin
  routing and Dokploy config diverge from the planned topology.
- **RISK-004**: Auth is cross-cutting and can break pantry flows if frontend and
  backend contracts are not updated in lockstep.
- **ASSUMPTION-001**: MongoDB remains the active runtime database during this
  implementation.
- **ASSUMPTION-002**: Same-origin `/api` remains the preferred production
  topology for Dokploy.
- **ASSUMPTION-003**: Legacy pantry data volume is small enough for a claim-time
  ownership reassignment strategy.

## 8. Related Specifications / Further Reading

- `docs/superpowers/specs/2026-04-23-auth-dao-deployment-design.md`
- `docs/superpowers/specs/2026-04-21-expiration-lot-model-design.md`
