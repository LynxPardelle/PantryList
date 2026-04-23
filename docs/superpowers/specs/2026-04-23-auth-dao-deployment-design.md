# PantryList Auth, DAO, and Production Deployment Design

Date: 2026-04-23
Status: Approved in chat and ready for implementation planning

## Context

This design was created from:

- The current PantryList codebase in:
  - `backend/src/app.module.ts`
  - `backend/src/app.setup.ts`
  - `backend/src/domain/entities/user.entity.ts`
  - `backend/src/domain/repositories/user.repository.ts`
  - `backend/src/infrastructure/http/controllers/pantry.controller.ts`
  - `backend/src/infrastructure/http/controllers/inventory-lots.controller.ts`
  - `backend/src/infrastructure/http/controllers/product-types.controller.ts`
  - `backend/src/infrastructure/http/controllers/products.controller.ts`
  - `frontend/src/app/core/services/session.service.ts`
  - `frontend/src/app/core/services/pantry.service.ts`
  - `frontend/src/app/core/services/product.service.ts`
  - `frontend/src/app/core/guards/auth.guard.ts`
  - `frontend/src/app/features/auth/login-page.component.ts`
  - `frontend/src/app/features/pantry/pantry-page.component.ts`
  - `frontend/src/server.ts`
  - `docker-compose.yml`
- The current project brief in `README.md`
- The user conversation on 2026-04-23 in which the auth, account, DAO, and
  deployment requirements were clarified

## Problem

PantryList currently has no real runtime authentication.

Today:

- the frontend "login" only stores a username in `localStorage`
- the route guard trusts that local frontend state
- the backend accepts `userId` from query parameters and request bodies
- persistence is scoped by that caller-supplied value
- the current Docker setup is still development-oriented, not production-ready

This leaves PantryList with a serious residual security gap:

- any client that can guess or supply another `userId` can try to act as that
  user on endpoints that trust client identity

The user wants PantryList to move to:

- PantryList-owned accounts only for now
- required email addresses for every real account
- secure password storage
- JWT-based authentication
- a persistence layer that can be swapped more easily between MongoDB and
  future databases
- a deployment path that fits later Dokploy and cloud scaling work

## Goals

- Introduce real PantryList accounts with required unique email addresses
- Keep a separate unique username for display and household identity
- Authenticate with short-lived access JWTs plus rotating refresh sessions
- Store passwords using a strong password hashing algorithm
- Remove client-supplied identity from the Pantry API surface
- Add password recovery and account recovery paths that depend on email
- Add a DAO-based persistence boundary so MongoDB is only one implementation
- Preserve existing pantry data without inventing fake email addresses
- Prepare the application for future Cognito and Google login integration
- Harden Docker and Dokploy deployment toward production use

## Non-Goals

- No Cognito integration in this phase
- No Google or other social login in this phase
- No household sharing, invitations, or roles in this phase
- No public third-party API token strategy in this phase
- No passwordless login in this phase
- No mandatory email verification flow in this phase
- No database engine swap in this phase; only the abstraction layer is required

## High-Level Decisions

### 1. Account model

- `email` is required and unique for every real PantryList account
- `username` is also required and unique
- `user.id` is the internal immutable owner identifier
- `email` is the login identifier for the first real auth version
- `username` remains the visible pantry identity shown in the UI

### 2. Session strategy

Use the user-approved option:

- short-lived access JWT in an `HttpOnly` cookie
- rotating refresh token in an `HttpOnly` cookie
- separate XSRF cookie/header pair for state-changing requests

### 3. Persistence strategy

The backend will depend on DAO interfaces, not directly on Mongoose models.

MongoDB remains the first implementation, but the application layer should be
able to switch to another database by replacing DAO implementations rather than
rewriting use cases or controllers.

### 4. Legacy migration strategy

Because email is now mandatory, PantryList must not create fake user accounts
for existing legacy usernames.

Instead:

- legacy usernames are migrated into claim records
- real `User` accounts are created only when a person claims a legacy account
  with `email + password`
- pantry data is reassigned from the legacy username to the new `user.id`
  during the claim flow

### 5. Deployment strategy

For production and Dokploy:

- serve the Angular frontend through the existing SSR server
- expose the frontend SSR container publicly
- keep the backend API as an internal service behind the frontend
- keep cookies and `/api` under the same origin whenever possible

This keeps cookie auth simpler and reduces future CORS complexity.

## Domain Model

### 1. User

Represents a real PantryList account.

Fields:

- `id`
- `email`
- `username`
- `status`
- `createdAt`
- `updatedAt`

Rules:

- `email` is required and unique
- `username` is required and unique
- `id` is immutable and becomes the canonical owner key for pantry data
- `status` starts as `active` for newly registered accounts
- `status` may later support `disabled`

### 2. PasswordCredential

Stores password-related data separately from the user profile.

Fields:

- `userId`
- `passwordHash`
- `passwordVersion`
- `lastPasswordChangeAt`
- `createdAt`
- `updatedAt`

Rules:

- passwords are never stored in plaintext
- use `Argon2id`
- the hash parameters must be configurable from environment variables
- password verification errors must not reveal whether the email exists

### 3. RefreshSession

Represents one browser session that can refresh access tokens.

Fields:

- `id`
- `userId`
- `refreshTokenHash`
- `expiresAt`
- `revokedAt` optional
- `createdAt`
- `updatedAt`
- `userAgent` optional
- `ipAddress` optional

Rules:

- refresh tokens are stored only as hashes
- refresh tokens rotate on every successful refresh
- refresh token reuse or replay invalidates the affected session

### 4. PasswordResetToken

Represents one password reset attempt.

Fields:

- `id`
- `userId`
- `tokenHash`
- `expiresAt`
- `usedAt` optional
- `createdAt`

Rules:

- reset tokens are single-use
- reset tokens are stored only as hashes
- reset endpoints must return generic responses regardless of whether the email
  exists

### 5. LegacyAccountClaim

Represents an imported legacy owner identity that still needs to be claimed by
a real account.

Fields:

- `id`
- `legacyUsername`
- `status`
- `claimedUserId` optional
- `createdAt`
- `updatedAt`
- `claimedAt` optional

Rules:

- `legacyUsername` is unique
- allowed statuses are:
  - `unclaimed`
  - `claiming`
  - `claimed`
  - `locked`
- this record is not a real user account
- it exists only to bridge legacy pantry ownership into the new account model

## DAO Boundaries

The backend should expose DAO ports for all persistence concerns that matter to
auth and pantry ownership.

Required DAO interfaces:

- `UserDao`
- `PasswordCredentialDao`
- `RefreshSessionDao`
- `PasswordResetTokenDao`
- `LegacyAccountClaimDao`
- `ProductDao`
- `ProductTypeDao`
- `InventoryLotDao`

Recommended supporting ports:

- `MailSender`
- `Clock`
- `IdGenerator`
- `JwtSigner`

Design rules:

- use cases depend on DAO interfaces only
- MongoDB implementations live under infrastructure
- query shape and indexes are infrastructure concerns, not application concerns
- future Postgres, DynamoDB, or managed identity integrations should replace or
  complement DAO implementations without changing core use cases

## Authentication And Recovery Flows

### Register

`POST /api/auth/register`

Request:

- `email`
- `username`
- `password`

Behavior:

- validate unique email and username
- create `User`
- create `PasswordCredential`
- create first `RefreshSession`
- issue access and refresh cookies
- return current user profile

### Login

`POST /api/auth/login`

Request:

- `email`
- `password`

Behavior:

- verify password against `PasswordCredential`
- create a new `RefreshSession`
- issue access and refresh cookies
- return current user profile

### Session bootstrap

`GET /api/auth/me`

Behavior:

- read access token from cookie
- return the current authenticated user if valid
- return `401` if no valid session exists

### Refresh

`POST /api/auth/refresh`

Behavior:

- validate refresh token cookie
- verify hashed stored refresh token
- rotate refresh token
- issue a new access token cookie
- issue a new refresh cookie

### Logout

`POST /api/auth/logout`

Behavior:

- revoke the current refresh session
- clear auth cookies

### Forgot password

`POST /api/auth/password/forgot`

Request:

- `email`

Behavior:

- always return a generic success response
- if the email exists, create a `PasswordResetToken`
- send a reset email through `MailSender`

### Reset password

`POST /api/auth/password/reset`

Request:

- `token`
- `password`

Behavior:

- validate the reset token
- replace the password hash
- invalidate outstanding refresh sessions for that user
- consume the reset token

### Claim imported account

`POST /api/auth/claim-imported-account`

Request:

- `legacyUsername`
- `email`
- `password`
- `finalUsername` optional if the legacy username should not become the final
  visible username

Behavior:

- find an `unclaimed` legacy record
- create a real `User`
- create `PasswordCredential`
- reassign pantry ownership from `legacyUsername` to `user.id`
- mark the claim record as `claimed`
- start a real authenticated session

This flow must be idempotent enough to recover from partial failures. The
ownership reassignment step should be written so it can be retried safely if it
is interrupted.

## JWT, Cookies, and XSRF

### JWT contents

Access token claims should stay minimal:

- `sub` = `user.id`
- `sid` = `refreshSession.id`
- standard issue and expiration claims

Refresh token handling:

- the raw refresh token is only sent to the browser
- only its hash is stored server-side

### Cookie policy

Recommended defaults:

- `access_token`
  - `HttpOnly`
  - `Secure` in production
  - `SameSite=Lax`
  - short TTL
- `refresh_token`
  - `HttpOnly`
  - `Secure` in production
  - `SameSite=Lax`
  - longer TTL
  - path scoped to auth routes when practical
- `XSRF-TOKEN`
  - not `HttpOnly`
  - `Secure` in production
  - `SameSite=Lax`

Because the recommended Dokploy shape is same-origin frontend plus proxied API,
`SameSite=Lax` is the default target for this phase.

### XSRF policy

- Angular uses relative `/api` requests
- frontend state-changing requests send the XSRF header
- backend validates XSRF on mutating authenticated routes
- safe methods such as `GET`, `HEAD`, and `OPTIONS` are exempt

## API Contract Changes

All pantry APIs must stop accepting identity from the client.

That means:

- remove `userId` from query strings
- remove `userId` from request bodies
- derive the acting user from the authenticated session only

This applies to:

- pantry overview
- inventory lots
- product types
- legacy products endpoints

Legacy product endpoints must also be hardened for ownership validation. The
current `GET /api/products/:id` and `PUT /api/products/:id/quantity` paths
must not remain weaker than the new authenticated endpoints.

## Frontend Architecture And NgRx

### Auth state

Add an `auth` store slice with:

- `sessionStatus`: `unknown | authenticated | anonymous`
- `currentUser`
- `loginPending`
- `registerPending`
- `refreshPending`
- `claimPending`
- `passwordRecoveryPending`
- `authError`

### Frontend services

Replace the current local-storage session model with:

- `AuthApiService`
- `AuthFacade`

Behavior:

- no JWT storage in `localStorage`
- no JWT storage in NgRx
- cookies remain browser-managed
- NgRx stores only derived auth state

### Screens and flows

Required first-pass screens:

- `Login`
- `Register`
- `Forgot password`
- `Reset password`
- `Claim imported account`

### App bootstrap

On app load:

- call `GET /api/auth/me`
- populate the auth store
- only then decide redirect behavior

### Guarding

- `AuthGuard` must depend on store-driven session state, not `localStorage`
- pantry features should assume the current user comes from the authenticated
  state

### Pantry client contracts

The frontend pantry and product services must stop sending `userId`.

The frontend should request "my pantry" and "my product types" while the
backend resolves the actual user.

## Legacy Migration Strategy

### Why a claim flow is required

Legacy pantry data is currently grouped by a caller-supplied string that acts
like a username. Because real accounts now require a unique email, PantryList
must not auto-create fake accounts for those legacy owner strings.

### Migration steps

1. Scan existing ownership values in:
   - `products`
   - `product_types`
   - `inventory_lots`
2. Create one `LegacyAccountClaim` per distinct legacy owner string
3. Leave the pantry data in place until the user claims it
4. When a claim succeeds:
   - create the real `User`
   - create `PasswordCredential`
   - bulk-update pantry ownership from the legacy username to the new `user.id`
   - mark the claim as completed

### Transitional ownership rule

During the migration window:

- newly created pantry data must always use the real `user.id`
- unclaimed legacy pantry data may still be keyed by the old legacy username
- authenticated application reads must only load data for the current real
  `user.id`

This means unclaimed legacy data stays inaccessible until claim, which is the
intended behavior.

### Cleanup

After all active legacy accounts are claimed:

- the legacy claim table remains as audit history
- pantry records should no longer reference legacy usernames

## Password Policy And Security Controls

Required controls:

- use `Argon2id`
- enforce a strong minimum password length
- reject common malformed email and username inputs
- rate-limit:
  - register
  - login
  - forgot password
  - reset password
  - claim imported account
- return generic auth and recovery errors
- never log plaintext passwords, tokens, or reset links
- revoke refresh sessions after password reset

## Mail Strategy

Add a `MailSender` port.

First phase responsibilities:

- password reset emails
- imported account claim support if needed later

Provider choice is intentionally deferred. The application should depend on the
mail port, not on a specific service.

## Docker And Dokploy Design

### Development

Keep a local development path that supports:

- MongoDB
- backend
- frontend
- bind mounts
- watch mode

This should remain clearly separated from production behavior.

### Production containers

#### Backend

Production backend image requirements:

- multi-stage Dockerfile
- build in one stage
- copy only runtime output and runtime dependencies into the final image
- run as non-root
- `NODE_ENV=production`
- health endpoint such as `/api/healthz`
- no bind mounts

#### Frontend

Production frontend image requirements:

- multi-stage Dockerfile
- build Angular SSR output
- run `node dist/frontend/server/server.mjs`
- no `ng serve`
- health endpoint such as `/healthz`
- no bind mounts

#### Docker hygiene

Add:

- `backend/.dockerignore`
- `frontend/.dockerignore`

These must exclude:

- `.env`
- `node_modules`
- build artifacts
- coverage artifacts
- git metadata when appropriate

### Dokploy topology

Recommended first production topology:

- public `frontend-ssr` service
- internal `backend-api` service
- internal MongoDB service or managed MongoDB later

Traffic flow:

- browser -> frontend SSR
- frontend SSR -> backend API through internal `BACKEND_URL`
- backend API -> MongoDB

This keeps browser requests same-origin for `/api` and simplifies cookie auth.

### Secrets and configuration

Production should use environment-based secrets for:

- JWT signing
- refresh token signing if separate
- Argon2 tuning
- mail provider credentials
- MongoDB connection

Prefer one canonical production database connection string. Development-only
helper variables can remain local to the development compose path.

## Testing Strategy

### Backend

- DAO contract tests for Mongo implementations
- unit tests for:
  - password hashing
  - login
  - refresh rotation
  - logout
  - password reset
  - legacy claim flow
- e2e tests for:
  - register
  - login
  - me
  - logout
  - refresh
  - forgot password
  - reset password
  - claim imported account
  - authenticated pantry overview
  - authenticated inventory mutations
  - ownership enforcement on legacy product endpoints

### Frontend

- auth reducer, selector, and effect tests
- guard tests for authenticated and anonymous paths
- component tests for:
  - login
  - register
  - forgot password
  - reset password
  - claim imported account
- pantry integration tests to confirm no `userId` is sent from the client

### Deployment verification

- build production backend image
- build production frontend image
- run smoke checks against health endpoints
- verify login, refresh, logout, and pantry overview through the containerized
  stack

## Rollout Order

1. Introduce auth, user, claim, session, and recovery domain models plus DAO
   ports
2. Implement MongoDB DAO adapters and migration scripts
3. Add auth endpoints, guards, current-user extraction, and ownership hardening
4. Move Angular to NgRx-backed auth state and remove client-supplied `userId`
5. Add password recovery and claim-account UI flows
6. Harden Dockerfiles, `.dockerignore`, and Dokploy-oriented runtime config
7. Run full test, container, and smoke verification

## Possible Future Features

- Cognito integration
- Google login
- email verification
- household invitations and roles
- managed MongoDB or other database backends
- provider-linked external auth accounts
- device/session management UI

## Recommendation

Implement PantryList around:

- PantryList-owned accounts with required email and username
- `Argon2id` password storage
- access JWT plus rotating refresh sessions in secure cookies
- XSRF protection for state-changing browser requests
- DAO interfaces as the persistence boundary
- `LegacyAccountClaim` records instead of fake imported user emails
- same-origin frontend SSR plus internal backend API for Dokploy and future
  scaling

This design closes the current client-supplied-identity gap while creating a
clean base for future Cognito and Google login work.
