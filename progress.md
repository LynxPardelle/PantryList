# Progress Log

## Session: 2026-04-20

### Phase 1: Requirements & Discovery
- **Status:** completed
- **Started:** 2026-04-20 Central Time
- Actions taken:
  - Confirmed `codex.local.env` exists and points `PROJECTS_ROOT` to
    `C:\Users\lince\Documents\GitHub`.
  - Confirmed the target repository path exists.
  - Read the `brainstorming`, `acquire-codebase-knowledge`, and
    `planning-with-files` skills to align the workflow.
  - Read the project `README.md` and `instructions.md`.
  - Inspected top-level repository structure and recent git commits.
  - Listed tracked files with `git ls-files` after `rg` failed in this
    environment.
  - Read frontend/backend package manifests, Docker Compose, and the GitHub
    Actions workflow.
  - Ran the bundled codebase scan and wrote `docs/codebase/.codebase-scan.txt`.
  - Inspected key frontend and backend source files to compare declared
    architecture with the actual runtime wiring.

### Phase 2: MVP Wiring
- **Status:** completed
- Actions taken:
  - Wired the backend `AppModule` with `ConfigModule`, `MongooseModule`,
    product controllers, use cases, and dependency injection tokens.
  - Added `GetProductByIdUseCase`, Mongo schema, and `MongoProductRepository`.
  - Added shared Nest app setup for `/api`, validation pipe, CORS, Helmet, and
    optional Swagger.
  - Updated the frontend from the Angular starter shell into an MVP with login,
    guarded pantry route, NgRx wiring, product form, list, and quantity updates.
  - Added SSR/API proxy handling and a configurable local proxy file for
    Angular dev mode.
  - Updated dependency locks with `npm update` in both frontend and backend.

## Session: 2026-04-21

### Phase 3: Docker Mongo + Fastify
- **Status:** completed
- **Started:** 2026-04-21 Central Time
- Actions taken:
  - Recovered Docker Desktop and validated host-container networking.
  - Moved PantryList backend onto Fastify.
  - Hardened local MongoDB Docker config with least-privilege app user,
    healthcheck, persistent volume, and localhost-only bind.
  - Validated the original MVP flow with API and browser smoke testing.

### Phase 4: Expiration Lots Implementation
- **Status:** completed
- Actions taken:
  - Approved and executed the `ProductType` + `InventoryLot` redesign from the
    spec under `docs/superpowers/specs/2026-04-21-expiration-lot-model-design.md`.
  - Added backend entities, repositories, schemas, controllers, mappers, and
    use cases for product types, inventory lots, grouped pantry overview, and
    expiring inventory queries.
  - Added a deterministic migration script to move legacy `products` data into
    `product_types` and `inventory_lots`.
  - Replaced the flat pantry frontend flow with grouped pantry cards, expiring
    visibility, lot registration, and consume-by-lot actions.
  - Repaired WSL `node` by adding a wrapper in `~/.local/bin/node` that
    delegates to the Windows `node.exe`, then verified `which node` and
    `node -v`.
  - Retried the brainstorming visual companion server successfully after the
    WSL repair.

### Phase 5: Hardening, Tests, and Skill Evaluation
- **Status:** completed
- Actions taken:
  - Used explorer subagents to review frontend and backend risks after the main
    implementation landed.
  - Fixed frontend regressions found in review:
    - prevented overlapping lot-consume requests
    - reset the canonical unit when switching from existing type to new type
    - added an explicit label for the existing-type search field
    - changed `takeUntilDestroyed()` usage to the explicit `DestroyRef` pattern
  - Fixed backend issues found in review:
    - Historical pre-auth guard: `GET /api/product-types/:id` required
      `userId` and returned `404` for another user's resource
    - `GET /api/inventory-lots/expiring` now validates `days` and respects
      windows larger than 7 days
    - product-type persistence now upserts by `(userId, normalizedBaseName)` in
      the normal application path to reduce duplicate creation races
  - Added focused tests for `GetExpiringLotsUseCase`,
    `GetProductTypeByIdUseCase`, and `PantryPageComponent`.

### Phase 6: Triple Audit With Corrections
- **Status:** completed
- **Started:** 2026-04-22 Central Time
- Actions taken:
  - Closed stale background agents that were no longer needed.
  - Executed a manual three-pass audit using the measurable criteria from the
    `audit` skill because its required dependency `/impeccable` was not
    available in this session.
  - Hardened API request validation so missing or blank `userId` now returns
    `400` in `product-types`, `inventory-lots`, and `pantry/overview`.
  - Added `IsNotEmpty` validation for DTO fields that were previously only
    typed as strings.
  - Improved pantry-page accessibility with `aria-labelledby`, `role="alert"`,
    `aria-live`, `aria-pressed`, `aria-expanded`, `aria-controls`, and
    suggestion-list selection state.
  - Reduced theming debt by moving visual primitives into global tokens and
    removing the pantry component style budget warning from the frontend build.

## Session: 2026-04-23

### Phase 7: Legacy Claim Migration Support
- **Status:** completed
- **Started:** 2026-04-23 Central Time
- Actions taken:
  - Added `backend/scripts/seed-legacy-account-claims.ts` to scan distinct
    `userId` ownership values across `products`, `product_types`, and
    `inventory_lots`, exclude currently known `users.id` values, and upsert
    `legacy_account_claims` safely with `$setOnInsert`.
  - Made the new script run in `dryRun` mode by default and print the exact
    detected `legacyOwners` so the migration can be inspected before writing.
  - Hardened `ClaimImportedAccountUseCase` to resume a partially completed
    `claiming` flow when the target `User` and verified password credential
    already exist, so ownership reassignment can be retried safely.
  - Added focused unit coverage for the retry-recovery path and documented the
    new migration step in `README.md`.

### Phase 8: Docker Dev Runtime Recovery
- **Status:** in_progress
- **Started:** 2026-04-23 Central Time
- Actions taken:
  - Verified that frontend requests to `http://localhost:4200/api/...` are
    expected in development because Angular proxies `/api` to the backend on
    port `3000`; the browser port was not the root cause of the failure.
  - Updated `docker-compose.yml` so the development `frontend` and `backend`
    containers start as `root` and run `npm ci --include=dev` before their dev
    commands, repairing stale Docker `node_modules` volumes that were missing
    runtime dependencies.
  - Updated the backend dev startup command to clear `dist` and
    `tsconfig.tsbuildinfo` before watch mode so fresh source edits are not
    shadowed by stale compiled output inside the container.
  - Fixed NestJS/Mongoose startup crashes by making nullable schema fields
    explicit in `legacy-account-claim`, `password-reset-token`, and
    `refresh-session` schemas.
  - Fixed `MongoProductTypeRepository.save` so the upsert no longer sends
    conflicting update operators during product-type creation.
  - Traced the remaining startup blocker to `pantrylist-mongodb`: the MongoDB
    healthcheck now fails with `SCRAM authentication failed` because the local
    named volume was initialized with credentials from an older stack version.
  - Documented the recovery path in `README.md`, including preserving the old
    credentials in `.env.docker.local` or, if local data can be discarded,
    resetting only the Docker Mongo volume.
  - Executed the destructive local recovery path by resetting the Docker Mongo
    volume, then validated the app end to end in the browser: register through
    `localhost:4200`, create a lot, consume from that lot, logout, login again,
    and confirm the pantry state persists after re-authentication.

## Session: 2026-04-24

### Phase 9: Durability Depletion Design
- **Status:** completed
- **Started:** 2026-04-24 Central Time
- Actions taken:
  - Wrote and committed
    `docs/superpowers/specs/2026-04-24-durability-depletion-design.md`.
  - Confirmed durability/depletion belongs to `ProductType`, not individual
    lots.
  - Confirmed product types without an active durability rule must be excluded
    from durability/depletion alerts.
  - Confirmed manual removals remain lot-specific quantity adjustments, while
    estimated current quantity is calculated dynamically at read time.
  - Kept AWS CDK and DynamoDB as a separate follow-up foundation instead of
    mixing cloud infrastructure into this feature pass.
  - Implemented `defaultDepletionRule` on `ProductType`, Mongo persistence,
    DTO validation, authenticated update endpoint, pantry overview
    `depletingItems`, Angular form controls, and the `Se agotan pronto` panel.
  - Verified the feature with unit tests, lint, builds, Docker Compose, and a
    browser smoke test over the Dockerized stack.

## Session: 2026-04-27

### Phase 10: Deterministic Shopping Plan
- **Status:** completed
- **Started:** 2026-04-27 Central Time
- Actions taken:
  - Created `plan/feature-shopping-plan-1.md` for the next deterministic
    planning slice after durability.
  - Added backend TDD coverage for `shoppingPlanItems` in pantry overview.
  - Extended pantry overview with shopping plan items for product types that
    have active durability rules.
  - Added a first-pass rule: recommend buying one depletion interval three
    days before estimated depletion, clamped to today when already due.
  - Added Angular models, service normalization, selector state, summary count,
    and a separate `Plan de compras` panel.
  - Reconciled stale documentation that still described client-supplied
    `userId` as the current identity boundary.

### Phase 11: Docker Runtime Stabilization
- **Status:** completed
- **Started:** 2026-04-27 Central Time
- Actions taken:
  - Repaired the existing MongoDB named volume without deleting data by
    temporarily mounting it in a no-port repair container and updating only the
    configured root and app users to match `.env.docker.local`.
  - Added `docker/mongodb/Repair-DockerMongoCredentials.ps1` so the recovery
    path can be repeated without copying sensitive one-off shell commands.
  - Removed duplicate Mongoose schema index declarations for normalized user
    and legacy-claim lookup fields.
  - Updated Docker Compose dev commands to `exec` the local Nest and Angular
    binaries directly, avoiding misleading `npm error signal SIGTERM` log noise
    on container restarts.
  - Recreated the Dockerized backend/frontend and verified the stack over HTTP.
  - Ran the credential repair script after the manual repair to verify the
    scripted path is idempotent for the current local Docker volume.

### Phase 12: Docker Port Isolation & Browser Smoke
- **Status:** completed
- **Started:** 2026-04-27 Central Time
- Actions taken:
  - Changed Docker host port defaults to avoid common conflicts:
    MongoDB `37917`, backend `39173`, and frontend `48673`.
  - Kept internal container ports unchanged so backend, frontend proxy, and
    MongoDB service networking continue to use the standard container ports.
  - Updated `.env.docker.example`, local `.env.docker.local`, Docker Compose,
    and README guidance for the new host ports.
  - Restarted Docker Desktop after the daemon disappeared during the first
    recreate attempt, then recreated the stack successfully.
  - Ran a browser smoke through `http://localhost:48673/register`: registered a
    fictitious local account, created a durable detergent lot, consumed `1 lt`
    manually, logged out, logged back in, and verified the pantry still showed
    the lot at `2 lt` with one shopping-plan item.

### Phase 13: Durability Editing & E2E Hardening
- **Status:** completed
- **Started:** 2026-04-27 Central Time
- Actions taken:
  - Installed `@playwright/test` with browser download skipped and configured
    Playwright to use the system Chrome channel by default.
  - Added `frontend/e2e/pantry-smoke.spec.ts` to cover register, durable lot
    creation, manual consumption, inline durability-rule editing, shopping-plan
    recalculation, logout, and login persistence.
  - Fixed the existing-type unit preview so it shows `Selecciona un tipo base`
    until the user actually selects a product type.
  - Added inline product-type durability-rule editing in the expanded pantry
    group, including enable/disable, amount, interval, period, and anchor date.
  - Added unit coverage for the new pantry UI behaviors and for auth refresh
    scheduling outside Angular's zone.
  - Fixed the development `NG0506` hydration warning by disabling hydration for
    the `ng serve` development runtime while keeping hydration enabled in the
    new production environment file.
  - Restarted the Docker frontend and verified the in-app browser produced no
    fresh warnings or errors after the 10-second hydration window.

### Phase 14: Production-Like Docker & Dokploy Readiness
- **Status:** completed
- **Started:** 2026-04-27 Central Time
- Actions taken:
  - Updated backend and frontend Dockerfiles from `node:20-alpine` to
    `node:22-alpine`.
  - Hardened `docker-compose.prod.yml` as an isolated `pantrylist-prod`
    topology with high default frontend port `48674`, internal backend/MongoDB,
    required JWT secrets, cookie controls, and component Mongo connection env
    variables.
  - Changed production Compose to pass Mongo credentials as components instead
    of interpolating `DATABASE_URL`, so generated passwords with URL-reserved
    characters are encoded by the backend.
  - Updated the frontend SSR `/api` proxy to preserve multiple `Set-Cookie`
    headers from the backend.
  - Consolidated production Angular environment replacement to the existing
    `environment.prod.ts` file and removed the duplicate
    `environment.production.ts`.
  - Added `.env.production.example` and `docs/deployment/dokploy.md` for
    Dokploy/local production-like setup.
  - Built and smoke-tested an isolated production-like stack on
    `http://localhost:48675` while keeping the development stack on `48673`.

### Phase 15: Cognito Auth Replacement Design
- **Status:** completed
- **Started:** 2026-04-27 Central Time
- Actions taken:
  - Confirmed the user-approved direction: replace local PantryList
    authentication with Cognito before any production deployment.
  - Re-read the current local auth implementation in backend and frontend,
    including `AuthController`, `AuthSessionService`, `AccessTokenGuard`,
    `AuthCookieService`, `AuthApiService`, NgRx auth effects, and auth routes.
  - Verified Cognito Hosted UI/social IdP, authorization endpoint, token
    endpoint, and PKCE behavior against official AWS documentation.
  - Wrote
    `docs/superpowers/specs/2026-04-27-cognito-auth-replacement-design.md`.
  - Runtime backend/frontend code was intentionally not changed during this
    design-gated step.

### Phase 16: Cognito Auth Replacement Implementation
- **Status:** completed
- **Started:** 2026-04-27 Central Time
- Actions taken:
  - Created `plan/feature-cognito-auth-replacement-1.md` for the approved
    implementation slice.
  - Installed `aws-jwt-verify` in the backend.
  - Added Cognito application ports for Hosted UI URL creation, token exchange,
    refresh, and token verification.
  - Added backend Cognito transaction handling for state, nonce, PKCE `S256`,
    safe relative redirects, and provider allowlisting.
  - Added Cognito profile sync that requires email, uses Cognito `sub` as
    local `User.id`, preserves disabled app users, and handles username
    collisions with a stable suffix.
  - Added Cognito infrastructure services for Hosted UI URLs, token endpoint
    calls, and `aws-jwt-verify` token verification.
  - Replaced active backend auth endpoints with Cognito login, callback, me,
    refresh, and logout endpoints.
  - Removed local password auth, local JWT session issuance, local reset email,
    and refresh-session providers from the active backend `AppModule` graph.
  - Replaced the Angular login page with Cognito provider buttons for Google,
    Facebook, and Cognito-hosted email.
  - Redirected active local register, forgot password, reset password, and
    claim-imported-account routes to `/login`.
  - Replaced the old full pantry Playwright smoke with a Cognito login launcher
    smoke because real social login now requires external AWS Cognito config.
  - Updated Docker, production env examples, README, and Dokploy docs with
    Cognito environment variables and callback/logout guidance.
  - Ran a lightweight secret scan; the generated report returned `count: 0`
    and `findings: []`. The JSON artifact was not kept because it contained an
    absolute local path.
  - Wrote the local review artifact
    `docs/reviews/2026-04-27-cognito-auth-comprehensive-review.md`.

### Phase 17: Cognito Auth Cleanup
- **Status:** completed
- **Started:** 2026-04-27 Central Time
- Actions taken:
  - Created `plan/feature-cognito-auth-cleanup-1.md`.
  - Removed inactive backend local password/JWT auth use cases, session
    service, auth-session result type, password/JWT/token ports, local auth
    DAOs, local auth schemas, local auth entities/value objects, and password
    or JWT infrastructure adapters.
  - Removed local auth tokens from `backend/src/application/tokens.ts` and
    local auth schemas from the active Mongoose module.
  - Replaced JWT-named cookie duration env validation with
    `AUTH_ACCESS_COOKIE_TTL_SECONDS` and
    `AUTH_REFRESH_COOKIE_TTL_SECONDS`.
  - Removed inactive Angular register, forgot password, reset password, and
    claim imported account components.
  - Removed inactive local auth NgRx actions, reducer branches, selectors,
    facade methods, request models, and the legacy localStorage
    `SessionService`.
  - Removed unused backend dependencies `@nestjs/jwt` and `argon2`.
  - Updated env examples and Compose files with the neutral auth cookie TTL env
    names.
  - Wrote `docs/reviews/2026-04-27-cognito-auth-cleanup-review.md`.
  - Ran a lightweight secret scan; the generated JSON returned `count: 0` and
    `findings: []`, then was deleted because it contained an absolute local
    path.

### Phase 18: Cognito AWS Infrastructure
- **Status:** completed
- **Started:** 2026-04-27 Central Time
- Actions taken:
  - Verified official AWS Cognito/CDK docs for app client callback URL rules,
    supported identity providers, social IdP provider details, domain prefix
    setup, and Managed Login versioning.
  - Added `infra/cognito`, a local AWS CDK TypeScript app for the Cognito User
    Pool, Managed Login v2 prefix domain, OAuth app client, local callback
    URLs, optional Dokploy callback URLs, and optional Google/Facebook IdPs.
  - Configured Google/Facebook IdPs to reference AWS Secrets Manager secret
    names instead of literal provider secrets.
  - Added `infra/cognito/cdk.context.example.json` and ignored local
    `infra/cognito/cdk.context.json`.
  - Added `infra/cognito/README.md` with bootstrap, synth, deploy, provider
    secret, and output-to-env steps.
  - Added `docs/deployment/cognito.md` to explain the difference between
    PantryList app callback URLs and Cognito social-provider
    `/oauth2/idpresponse` URLs.
  - Updated README and Dokploy docs to point to the CDK app.
  - Wrote `docs/reviews/2026-04-27-cognito-aws-infra-review.md`.
  - Did not run `cdk deploy`; deployment still needs explicit AWS account,
    region, globally unique Cognito domain prefix, and real provider
    credentials.

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Backend lint | `npm run lint` | Clean lint pass | Passed | ✓ |
| Backend unit tests | `npm test` | Tests pass with new expiration-lot coverage | 5 suites passed, 10 tests passed | ✓ |
| Backend e2e | `npm run test:e2e` | Starter e2e still passes | Passed | ✓ |
| Backend build | `npm run build` | Build compiles after hardening changes | Passed | ✓ |
| Frontend tests | `npm run test:ci` | Component and app tests pass | 6 tests passed | ✓ |
| Frontend build | `npm run build` | SSR build compiles | Passed with SCSS budget warning | ✓ |
| Frontend login smoke | `Invoke-WebRequest http://localhost:4200/login` | HTTP 200 | `StatusCode = 200` | ✓ |
| Expiring API window | `days=7` vs `days=30` | Wider window should include additional stable lot | `days=7 => 2 lots`, `days=30 => 3 lots` | ✓ |
| Historical product type ownership guard | `GET /api/product-types/:id` variants before auth-backed controllers | Missing `userId` => `400`, wrong user => `404`, owner => `200` | Observed exactly at the time | ✓ |
| Historical overview validation guard | `GET /api/pantry/overview` without `userId` before auth-backed controllers | Should reject invalid request | Returned `400` at the time | ✓ |
| Historical inventory list validation guard | `GET /api/inventory-lots?userId=` before auth-backed controllers | Should reject blank user id | Returned `400` at the time | ✓ |
| Frontend style budget | `npm run build` in `frontend/` | No component style warning | Passed cleanly | ✓ |
| Claim retry recovery spec | `npx jest src/application/use-cases/claim-imported-account.use-case.spec.ts --runInBand` | Claim recovery tests pass | 3 tests passed | ✓ |
| Legacy claim script typecheck | `npx tsc --pretty false --noEmit .\scripts\seed-legacy-account-claims.ts` | Script compiles without TS errors | Passed | ✓ |
| Docker Compose syntax | `docker compose --env-file .env.docker.example config` | Development compose resolves with documented env file | Passed | ✓ |
| Browser register flow | Register at `http://localhost:4200/register` | User should authenticate and land in pantry | Passed | ✓ |
| Pantry lot registration | Create a new type + lot from pantry UI | Summary and grouped pantry should update | Passed | ✓ |
| Pantry lot consumption | Consume from expanded pantry lot card | Quantity should decrement and remain persisted | Passed | ✓ |
| Auth persistence after relogin | Logout and login with the same account | Pantry state should still be visible | Passed | ✓ |
| Backend durability tests | `npm test -- --runInBand` in `backend/` | All backend tests pass with durability coverage | 10 suites passed, 24 tests passed | ✓ |
| Backend lint | `npm run lint` in `backend/` | No lint errors or warnings | Passed | ✓ |
| Backend e2e | `npm run test:e2e` in `backend/` | Health endpoints pass | 1 suite passed, 2 tests passed | ✓ |
| Frontend durability tests | `npm run test:ci` in `frontend/` | All Angular tests pass | 10 tests passed | ✓ |
| Frontend durability build | `npm run build` in `frontend/` | Build compiles without SCSS budget warning | Passed | ✓ |
| Docker app stack | `docker compose --profile app up -d --build` | Backend, frontend, and MongoDB start | `backend=200 frontend=200`; MongoDB healthy | ✓ |
| Durability browser smoke | Register, create durable detergent, consume manually | Dynamic estimate should use persisted lot quantity and scheduled depletion | Create: `4 -> estimated 1`; consume: `3 -> estimated 0` | ✓ |
| Backend shopping plan tests | `npm test -- --runInBand` in `backend/` | Pantry overview includes sorted shopping plan coverage | 10 suites passed, 25 tests passed | ✓ |
| Frontend shopping plan tests | `npm run test:ci` in `frontend/` | Angular service normalizes shopping plan dates | 11 tests passed | ✓ |
| Frontend shopping plan build | `npm run build` in `frontend/` | Build compiles without SCSS budget warning | Passed | ✓ |
| Backend shopping plan build | `npm run build` in `backend/` | Backend compiles | Passed | ✓ |
| Backend shopping plan e2e | `npm run test:e2e` in `backend/` | Health endpoints pass | 1 suite passed, 2 tests passed | ✓ |
| Docker shopping plan runtime smoke | `docker compose --env-file .env.docker.local --profile app up -d --build` | Backend, frontend, and MongoDB start | Images built; frontend started; backend blocked because `pantrylist-mongodb` is unhealthy with SCRAM authentication failure for the existing named volume | BLOCKED |
| Docker Mongo credential repair | Temporary no-port MongoDB repair container over `pantrylist_mongodb_data` | Preserve data and align root/app users with `.env.docker.local` | Repair completed; normal MongoDB service became healthy | ✓ |
| Backend schema-index lint | `npm run lint` in `backend/` | No lint errors | Passed | ✓ |
| Backend schema-index tests | `npx jest --runInBand` in `backend/` | Backend tests pass after schema index cleanup | 10 suites passed, 25 tests passed | ✓ |
| Backend schema-index build | `npm run build` in `backend/` | Backend compiles | Passed | ✓ |
| Docker Compose config | `docker compose --env-file .env.docker.local --profile app config --quiet` | Compose file is valid | Passed | ✓ |
| Docker runtime after repair | HTTP smoke and recent log scan | Backend, frontend, and MongoDB run without duplicate-index or auth failures | `backend /api/healthz => 200`, `frontend /login => 200`, specific bad log matches: none | ✓ |
| Mongo repair script idempotence | `.\docker\mongodb\Repair-DockerMongoCredentials.ps1 -EnvFile .env.docker.local` | Script can rerun without deleting the local volume | Repair completed; `backend /api/healthz => 200`; `frontend /login => 200`; MongoDB healthy | ✓ |
| Docker high-port config | `docker compose --env-file .env.docker.local --profile app up -d --force-recreate` | PantryList uses uncommon host ports and frees common project ports | `39173/api/healthz => 200`; `48673/login => 200`; old `3000` and `4200` not responding; old `27017` free | ✓ |
| Browser high-port smoke | In-app browser at `http://localhost:48673/register` | Register, create durable lot, consume manually, logout/login, verify persistence | Durable detergent lot persisted at `2 lt`; `Plan de compras = 1`; console warnings/errors: none | ✓ |
| Frontend E2E install | `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --save-dev @playwright/test` | Add Playwright without downloading browser binaries | Added 3 packages; npm reported 11 dev-tooling audit findings | ✓ |
| Frontend E2E smoke | `E2E_BASE_URL=http://localhost:48673 npm run test:e2e` | Register, create durable lot, consume, edit durability, verify plan, logout/login | 1 Playwright test passed | ✓ |
| Frontend durability edit tests | `npm run test:ci` in `frontend/` | New pantry and auth effects specs pass | 15 tests passed | ✓ |
| Frontend durability edit build | `npm run build` in `frontend/` | Production build compiles with environment replacement | Passed | ✓ |
| Backend verification after frontend changes | `npm run lint`, `npx jest --runInBand`, `npm run build`, `npm run test:e2e` in `backend/` | Backend remains green | Lint passed; 10 suites/25 tests passed; build passed; e2e 1 suite/2 tests passed | ✓ |
| Frontend production dependency audit | `npm audit --omit=dev --json` in `frontend/` | No production dependency vulnerabilities | `total = 0` | ✓ |
| Frontend full dependency audit | `npm audit --json` and `npm audit fix` in `frontend/` | Identify and fix non-breaking vulnerabilities | 11 dev-tooling findings remain; `npm audit fix` reported no non-breaking fix and `--force` would install `@angular/cli@21.2.8` | REVIEW |
| Docker frontend warning check | In-app browser reload after frontend restart | No fresh browser warnings/errors after 10 seconds | `freshWarningOrErrorCount = 0` | ✓ |
| Production Compose config | `docker compose -f docker-compose.prod.yml --env-file .env.production.example config --quiet` | Compose file resolves with documented env example | Passed | ✓ |
| Frontend build after prod config | `npm run build` in `frontend/` | Angular SSR build compiles with production file replacement | Passed | ✓ |
| Backend build after prod config | `npm run build` in `backend/` | NestJS production output compiles | Passed | ✓ |
| Production-like Docker build | `docker compose -p pantrylist-prod-smoke2 -f docker-compose.prod.yml up -d --build` with ephemeral local env vars | Images build and services become healthy | MongoDB, backend, and frontend healthy; frontend published on `48675` | ✓ |
| Production-like HTTP health | `http://localhost:48675/healthz` and `/api/healthz` | Frontend and proxied backend health return 200 | Both returned 200 | ✓ |
| Production-like E2E | `E2E_BASE_URL=http://localhost:48675 npm run test:e2e` | Register/login/cookies/durable pantry flow works through frontend SSR proxy | 1 Playwright test passed | ✓ |
| Frontend tests after prod config | `npm run test:ci` in `frontend/` | Angular tests stay green | 15 tests passed | ✓ |
| Backend tests after prod config | `npm run lint`, `npx jest --runInBand`, `npm run build`, `npm run test:e2e` in `backend/` | Backend checks stay green | Lint passed; 10 suites/25 tests passed; build passed; e2e 1 suite/2 tests passed | ✓ |
| Production dependency audits after prod config | `npm audit --omit=dev --json` in `frontend/` and `backend/` | No production dependency vulnerabilities | Both returned `total = 0` | ✓ |
| Cognito design placeholder scan | `Select-String -Path docs\superpowers\specs\2026-04-27-cognito-auth-replacement-design.md -Pattern 'TBD','TODO','???','placeholder' -SimpleMatch` | No incomplete placeholders | No matches returned | ✓ |
| Backend Cognito lint | `npm run lint` in `backend/` | No lint errors | Passed | ✓ |
| Backend Cognito unit tests | `npx jest --runInBand` in `backend/` | All backend tests pass with Cognito coverage | 18 suites passed, 50 tests passed | ✓ |
| Backend Cognito build | `npm run build` in `backend/` | NestJS build compiles | Passed | ✓ |
| Backend Cognito e2e | `npm run test:e2e` in `backend/` | Health e2e tests pass after guard changes | 1 suite passed, 2 tests passed | ✓ |
| Frontend Cognito tests | `npm run test:ci` in `frontend/` | Angular specs pass with Cognito auth effects | `TOTAL: 17 SUCCESS` | ✓ |
| Frontend Cognito build | `npm run build` in `frontend/` | Angular SSR build compiles | Passed | ✓ |
| Frontend Cognito E2E | `$env:E2E_BASE_URL='http://localhost:48673'; npm run test:e2e` in `frontend/` | Cognito login launcher smoke passes | 1 Playwright test passed | ✓ |
| Backend production dependency audit after Cognito | `npm audit --omit=dev --json` in `backend/` | No production dependency vulnerabilities | `total = 0`; `prod = 205`; `total dependencies = 879` | ✓ |
| Frontend production dependency audit after Cognito | `npm audit --omit=dev --json` in `frontend/` | No production dependency vulnerabilities | `total = 0`; `prod = 100`; `total dependencies = 1046` | ✓ |
| Development Compose config after Cognito | `docker compose --env-file .env.docker.example --profile app config --quiet` | Compose dev config resolves | Passed | ✓ |
| Production Compose config after Cognito | `docker compose -f docker-compose.prod.yml --env-file .env.production.example config --quiet` | Compose prod config resolves | Passed | ✓ |
| Docker backend health after Cognito | `Invoke-WebRequest http://localhost:39173/api/healthz` | Backend health returns 200 | `200` | ✓ |
| Docker frontend login after Cognito | `Invoke-WebRequest http://localhost:48673/login` | Frontend login page returns 200 | `200` | ✓ |
| Cognito disabled fail-closed smoke | `Invoke-WebRequest http://localhost:48673/api/auth/cognito/login?provider=Google` | Local dev without Cognito config should not fall back to local passwords | `503` | ✓ |
| Stale local JWT cookie smoke | `Invoke-WebRequest http://localhost:48673/api/auth/me` with `Cookie=pantrylist_access_token=stale-local-jwt` | Stale local JWT should return unauthorized, not server error | `401` | ✓ |
| Secret scan after Cognito | `python C:\Users\lince\.codex\skills\security-compliance\scripts\secret_scan.py . --json --output ...` | No likely secrets in tracked workspace | JSON output had `count = 0` and `findings = []` | ✓ |
| Backend auth cleanup lint | `npm run lint` in `backend/` | No lint errors after deleting local auth source | Passed | ✓ |
| Backend auth cleanup unit tests | `npx jest --runInBand` in `backend/` | All remaining backend tests pass after local auth cleanup | 17 suites passed, 47 tests passed | ✓ |
| Backend auth cleanup build | `npm run build` in `backend/` | NestJS build compiles after dependency cleanup | Passed | ✓ |
| Backend auth cleanup e2e | `npm run test:e2e` in `backend/` | Health e2e tests pass | 1 suite passed, 2 tests passed | ✓ |
| Frontend auth cleanup tests | `npm run test:ci` in `frontend/` | Angular specs pass after removing inactive screens/actions | `TOTAL: 17 SUCCESS` | ✓ |
| Frontend auth cleanup build | `npm run build` in `frontend/` | Angular SSR build compiles | Passed | ✓ |
| Frontend auth cleanup E2E | `$env:E2E_BASE_URL='http://localhost:48673'; npm run test:e2e` in `frontend/` | Cognito login launcher smoke still passes | 1 Playwright test passed | ✓ |
| Backend production audit after auth cleanup | `npm audit --omit=dev --json` in `backend/` | No production dependency vulnerabilities | `total = 0`; `prod = 146`; `total dependencies = 858` | ✓ |
| Frontend production audit after auth cleanup | `npm audit --omit=dev --json` in `frontend/` | No production dependency vulnerabilities | `total = 0`; `prod = 100`; `total dependencies = 1046` | ✓ |
| Development Compose config after auth cleanup | `docker compose --env-file .env.docker.example --profile app config --quiet` | Compose dev config resolves with neutral auth cookie TTL vars | Passed | ✓ |
| Production Compose config after auth cleanup | `docker compose -f docker-compose.prod.yml --env-file .env.production.example config --quiet` | Compose prod config resolves with Cognito env and neutral auth cookie TTL vars | Passed | ✓ |
| Docker HTTP smoke after auth cleanup | backend health, frontend login, stale JWT cookie, Cognito-disabled login | Current local stack should stay stable | backend `200`; frontend `200`; stale JWT `401`; Cognito login disabled `503` | ✓ |
| Secret scan after auth cleanup | `python C:\Users\lince\.codex\skills\security-compliance\scripts\secret_scan.py . --json --output ...` | No likely secrets in tracked workspace | JSON output had `count = 0` and `findings = []` | ✓ |
| Cognito CDK dependency install | `npm install` in `infra/cognito/` | Install CDK dependencies without audit findings | Added 26 packages; `found 0 vulnerabilities` | ✓ |
| Cognito CDK build | `npm run build` in `infra/cognito/` | TypeScript CDK app compiles | Passed | ✓ |
| Cognito CDK base synth | `npm run synth` in `infra/cognito/` | Synthesizes User Pool, Managed Login domain, app client, and outputs | Passed | ✓ |
| Cognito CDK social-provider synth | `npx cdk synth --context enableGoogle=true ... --context enableFacebook=true ...` | Synthesizes Google/Facebook IdPs with Secrets Manager dynamic references and Dokploy callback URLs | Passed | ✓ |
| Cognito CDK production dependency audit | `npm audit --omit=dev --json` in `infra/cognito/` | No production dependency vulnerabilities | `total = 0`; `prod = 44`; `total dependencies = 64` | ✓ |
| Backend build after Cognito infra docs | `npm run build` in `backend/` | Backend still compiles | Passed | ✓ |
| Frontend build after Cognito infra docs | `npm run build` in `frontend/` | Frontend still compiles | Passed | ✓ |
| Secret scan after Cognito infra | `python C:\Users\lince\.codex\skills\security-compliance\scripts\secret_scan.py . --json --output ...` | No likely secrets in tracked workspace | JSON output had `count = 0` and `findings = []` | ✓ |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-04-20 Central Time | `rg.exe` access denied in packaged Codex environment | 1 | Switched to `git ls-files` and native PowerShell inspection |
| 2026-04-21 Central Time | `agent-browser` local smoke path produced `chrome-error://chromewebdata/` and `doctor --offline --quick --json` timed out | 1 | Fell back to Playwright for browser validation and recorded the skill limitation |
| 2026-04-21 Central Time | `code-reviewer` wrapper returned `config profile 'code-reviewer' not found` | 1 | Recorded as local skill configuration issue; no fake review output was substituted |
| 2026-04-21 Central Time | `takeUntilDestroyed()` in `ngOnInit` failed in the new Angular test | 1 | Switched to `takeUntilDestroyed(this.destroyRef)` and reran tests |
| 2026-04-23 Central Time | `npx ts-node .\scripts\seed-legacy-account-claims.ts` failed with `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017` | 1 | Kept verification at the TypeScript level because local MongoDB was not listening during this session |
| 2026-04-23 Central Time | `docker compose --profile app up -d --build` left `pantrylist-backend` compiling with missing modules and later blocked on `pantrylist-mongodb` health | 1 | Updated dev compose startup to run `npm ci --include=dev` as `root`; remaining blocker is a legacy Mongo named volume whose stored credentials do not match the current env, requiring either the original credentials or a local Docker volume reset |
| 2026-04-24 Central Time | `pantrylist-backend` started with stale compiled logic after source edits, then failed with repeated `CannotDetermineTypeError`, `DATABASE_URL` validation, and Mongo conflicting update operators during lot creation | 1 | Cleared backend build artifacts before watch start, made nullable Mongoose schema fields explicit, provided a non-empty `DATABASE_URL` default for dev compose, and removed conflicting upsert paths in `MongoProductTypeRepository` |
| 2026-04-24 Central Time | `docker compose --profile app up -d --build` initially failed with `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine` because Docker Desktop was not running | 1 | Started Docker Desktop, waited until `docker info` succeeded, then rebuilt and started the app stack successfully |
| 2026-04-27 Central Time | First frontend `npm run test:ci` attempt timed out without useful output | 1 | Re-ran with a longer timeout; Karma completed with `TOTAL: 11 SUCCESS` |
| 2026-04-27 Central Time | Docker shopping plan runtime smoke built images but `pantrylist-mongodb` stayed unhealthy with `AuthenticationFailed: SCRAM authentication failed, storedKey mismatch` for the existing local Mongo named volume | 1 | Repaired non-destructively by stopping MongoDB, mounting `pantrylist_mongodb_data` in a temporary no-port repair container, updating the configured root/app users, and restarting the normal authenticated stack |
| 2026-04-27 Central Time | Backend Docker logs showed duplicate Mongoose schema index warnings for normalized user and legacy-claim lookup fields | 1 | Kept one explicit `Schema.index(...)` definition per normalized lookup field and removed path-level unique/index declarations that generated duplicate index definitions |
| 2026-04-27 Central Time | Docker backend restart logs showed misleading `npm error signal SIGTERM` when watchers were stopped during container recreation | 1 | Updated Docker Compose dev commands to install dependencies first and then `exec` the local Nest/Angular binaries directly instead of wrapping long-running watchers with `npm` |
| 2026-04-27 Central Time | First PowerShell port-free check failed because `"port $port:"` was parsed as an invalid variable reference | 1 | Retried with `"port ${port}:"`, confirming `37917`, `39173`, and `48673` were free |
| 2026-04-27 Central Time | Automatic `.env.docker.local` update attempted to append to a fixed-size PowerShell collection | 1 | Avoided printing secrets and updated the ignored local env file with `apply_patch` |
| 2026-04-27 Central Time | `docker compose --env-file .env.docker.local --profile app up -d --force-recreate` timed out because Docker Desktop stopped exposing `dockerDesktopLinuxEngine` | 1 | Started Docker Desktop, waited for `docker info` to succeed, then recreated the stack successfully |
| 2026-04-27 Central Time | Browser smoke initially tried unit value `litros`, but the form options use `lt` as the canonical unit value | 1 | Inspected the select options in the DOM, selected `lt`, and completed the durable-lot smoke |
| 2026-04-27 Central Time | First Playwright E2E failed because `getByLabel('Caducidad')` matched both the pantry `main` and the date input | 1 | Scoped locators to `form.lot-form` and used exact label matching for the date input |
| 2026-04-27 Central Time | New auth effects spec first failed with TypeScript generic errors in a mocked `NgZone` | 1 | Replaced the hand-rolled `NgZone` provider with the real Angular `NgZone` and a `spyOn` assertion |
| 2026-04-27 Central Time | In-app browser still showed fresh Angular `NG0506` warnings after moving the auth refresh timer outside Angular | 2 | Traced the remaining issue to development hydration under `ng serve`; disabled hydration in dev and kept it enabled in production |
| 2026-04-27 Central Time | `rg.exe` again failed with `Acceso denegado` while searching frontend sources | 1 | Switched to `Get-ChildItem -Recurse` plus `Select-String` |
| 2026-04-27 Central Time | `npm audit` reported 11 frontend dev-tooling vulnerabilities after adding Playwright | 1 | `npm audit --omit=dev` returned 0 production vulnerabilities; `npm audit fix` had no non-breaking fix, and `--force` would require a breaking Angular CLI 21 migration |
| 2026-04-27 Central Time | First production-like Docker attempt left backend unhealthy with `"DATABASE_URL" must be a valid uri` | 1 | Root cause: Compose interpolated an unencoded random Mongo password into `DATABASE_URL`; changed prod Compose to pass Mongo components and let backend URL-encode credentials |
| 2026-04-27 Central Time | `docker compose -p pantrylist-prod-smoke -f docker-compose.prod.yml ps` failed without required env vars | 1 | Used `docker ps --filter name=pantrylist-prod-smoke2` for status checks, which does not require Compose interpolation |
| 2026-04-27 Central Time | `npm install aws-jwt-verify` and Docker dev dependency installation reported moderate dev dependency audit findings | 1 | Verified runtime risk separately with `npm audit --omit=dev --json` in backend and frontend; both production dependency audits returned `total = 0` |
| 2026-04-27 Central Time | Stale local JWT cookies produced a backend `500` after replacing local JWT verification with Cognito verification while Cognito was disabled | 1 | Updated `AccessTokenGuard` to convert verifier failures into `UnauthorizedException`; verified stale local JWT cookie now returns `401` |
| 2026-04-27 Central Time | The old full pantry E2E was no longer valid after replacing local register/login with Cognito redirects | 1 | Replaced it with `frontend/e2e/auth-cognito-smoke.spec.ts`, which stubs the Hosted UI redirect and verifies the Cognito provider launcher |
| 2026-04-27 Central Time | PowerShell rejected the Bash-style command `E2E_BASE_URL=http://localhost:48673 npm run test:e2e` | 1 | Re-ran as `$env:E2E_BASE_URL='http://localhost:48673'; npm run test:e2e`; Playwright passed |
