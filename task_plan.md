# Task Plan: PantryList AWS modernization and completion

## Goal
Review PantryList end to end, define an AWS-aligned target architecture that fits the current Angular + NestJS + MongoDB codebase, and then implement the approved path to move the project toward a production-ready state while exercising the newly installed skills.

## Current Phase
Phase 13

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm target repository and local environment
- [x] Read top-level intent documents and repo layout
- [x] Inspect frontend, backend, deployment, and validation assets
- [x] Document findings in findings.md
- **Status:** completed

### Phase 2: Planning & Structure
- [x] Define AWS integration options that match the current stack
- [x] Recommend one approach with trade-offs
- [x] Present design and wait for user approval
- **Status:** completed

### Phase 3: Implementation
- [x] Implement the approved MVP-first changes
- [x] Keep changes focused and compatible with the existing architecture
- [x] Update docs and local project guidance as needed
- **Status:** completed

### Phase 4: Testing & Verification
- [x] Run the strongest available checks for frontend, backend, and integration paths
- [x] Document test results and gaps in progress.md
- [x] Fix issues discovered during verification
- **Status:** completed

### Phase 5: Delivery
- [x] Summarize architectural changes, verification, and remaining risks
- [x] Save durable project decisions in PantryList docs
- [x] Hand off with recommended next steps
- **Status:** completed

### Phase 6: Product Planning Loop
- [x] Add deterministic shopping plan from durability forecasts
- [x] Keep expiration, depletion, and shopping planning separate in the UI
- [x] Verify backend/frontend tests and builds
- **Status:** completed

### Phase 7: Docker Runtime Stabilization
- [x] Repair the existing MongoDB named volume without deleting application data
- [x] Remove duplicate Mongoose schema index warnings
- [x] Reduce misleading Docker restart log noise from npm-wrapped watchers
- [x] Verify backend/frontend/Mongo runtime over Docker Compose
- **Status:** completed

### Phase 8: Docker Port Isolation & Browser Smoke
- [x] Move published Docker host ports away from common `3000`, `4200`, and `27017`
- [x] Keep internal container ports unchanged for service-to-service networking
- [x] Verify old host ports are free and new host ports respond
- [x] Run browser smoke with register, durable lot creation, manual consumption, logout, and login persistence
- **Status:** completed

### Phase 9: Durability Editing & E2E Hardening
- [x] Add automated Playwright E2E coverage for register, durable lot creation, manual consumption, durability-rule editing, shopping plan, logout, and login persistence
- [x] Polish existing-type unit preview so it does not imply `piezas` before a type is selected
- [x] Add inline product-type durability rule editing from the grouped pantry view
- [x] Fix development hydration warning by disabling hydration for `ng serve` while keeping production hydration enabled
- [x] Verify frontend, backend, Docker runtime, browser smoke, and dependency audit status
- **Status:** completed

### Phase 10: Production-Like Docker & Dokploy Readiness
- [x] Move production images to Node 22 runtime/build base images
- [x] Make `docker-compose.prod.yml` isolated, high-port, and secret-explicit
- [x] Keep backend and MongoDB internal while exposing only the frontend SSR server
- [x] Preserve proxied auth cookies through the frontend SSR `/api` proxy
- [x] Add Dokploy deployment notes and a safe production env example
- [x] Verify production-like stack with health checks and Playwright E2E
- **Status:** completed

### Phase 11: Cognito Auth Replacement Design
- [x] Confirm the approved direction: replace local auth with Cognito before production
- [x] Inspect current local auth boundaries in backend and frontend
- [x] Verify Cognito Hosted UI, social IdP, token endpoint, and PKCE constraints from official AWS docs
- [x] Write the architecture/security spec
- [x] Self-review the spec for placeholders, contradictions, ambiguity, and scope
- [x] Wait for user review before runtime implementation
- **Status:** completed

### Phase 12: Cognito Auth Replacement Implementation
- [x] Add Cognito backend ports, Hosted UI URL builder, token client, token verifier, transaction cookies, and profile sync
- [x] Replace active backend auth endpoints with Cognito login, callback, me, refresh, and logout
- [x] Replace Angular local login UI with Cognito provider launchers and redirect inactive local auth routes
- [x] Update Docker, production env examples, README, and Dokploy docs for Cognito
- [x] Verify backend, frontend, Docker, E2E, and production dependency audits
- **Status:** completed

### Phase 13: Cognito Auth Cleanup
- [x] Remove inactive backend local password/JWT auth use cases, adapters, entities, schemas, and tokens
- [x] Remove inactive frontend register, forgot password, reset password, and claim imported account screens/actions/state
- [x] Remove unused backend local-auth dependencies
- [x] Rename auth cookie TTL configuration away from JWT terminology
- [x] Verify tests, builds, audits, Compose config, HTTP smoke, and secret scan
- **Status:** completed

## Key Questions
1. Which AWS integration path best fits PantryList's current maturity: container-first, serverless-first, or hybrid?
2. What parts of the existing implementation are solid enough to preserve, and what parts are still mostly scaffold or incomplete?
3. Which missing production concerns matter most for a first serious completion pass: auth, environment/config, persistence strategy, deployment, or observability?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use PantryList at `C:\Users\lince\Documents\GitHub\PantryList` as the first real validation project for the installed skills | User explicitly selected this repository and wants it used to exercise the new workflow |
| Follow brainstorming before implementation | The installed skill requires design approval before any code changes |
| Use file-based planning in the repo root | This task is multi-step and benefits from persistent execution memory |
| Classify the repository as an incomplete MVP scaffold with some useful backend/domain work already present | The runtime wiring, frontend screens, DB adapters, and deployment path are substantially behind the documented intent |
| Use Playwright E2E with the system Chrome channel | This gives repeatable browser coverage without downloading browser binaries into the repo workflow |
| Disable hydration only for the development `ng serve` runtime | The Docker frontend runs as a client dev server, while production builds still need hydration for SSR/prerendered output |
| Use component Mongo env vars in production Compose instead of interpolating `DATABASE_URL` | Generated passwords can contain URL-reserved characters; the backend already URL-encodes component credentials |
| Keep local production-like smoke isolated under a separate Compose project and high host port | This lets the dev stack remain available at `48673` while validating a production topology at `48675` |
| Replace local PantryList authentication with Cognito before production | The user wants Google/Facebook and future account recovery through a managed identity authority rather than keeping local passwords |
| Remove local password auth from the active route/provider graph now instead of keeping fallback behavior | The project is not deployed to production yet, and a single auth authority avoids split recovery, revocation, and account-linking behavior |
| Delete inactive local auth source after Cognito implementation | Keeping dormant password/JWT code increases future confusion and the risk of accidentally restoring a second auth authority |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `rg.exe` failed with access denied in this environment | 1 | Switched to `git ls-files` and native PowerShell file inspection |
| Stale local JWT cookies produced a backend `500` during Cognito-disabled smoke testing | 1 | Updated `AccessTokenGuard` to convert Cognito verifier failures into `401 Unauthorized`, then verified stale cookies return `401` |

## Notes
- Update phase status as progress changes.
- Re-read this file before major design or implementation decisions.
- Keep AWS additions aligned to the existing codebase rather than forcing a full rewrite.
- User chose the MVP-first path before AWS-specific expansion.
- Docker Compose is the primary local full-stack workflow. If the named MongoDB
  volume credentials drift from the active `.env.docker.local`, prefer a
  non-destructive credential repair against the stopped local volume before
  considering a local volume reset.
- Docker development host ports are intentionally high and configurable:
  MongoDB `37917`, backend `39173`, and frontend `48673` by default.
- The latest validated product loop includes auth-backed pantry access,
  expiration lots, durability/depletion forecasts, and a deterministic
  shopping plan.
- Playwright E2E is installed in the frontend dev toolchain and defaults to
  `PLAYWRIGHT_BROWSER_CHANNEL=chrome`.
- Production builds now use the tracked `environment.prod.ts` replacement with
  hydration enabled and NgRx DevTools disabled; development keeps hydration
  disabled to avoid Angular `NG0506` noise under `ng serve`.
- The production-like Compose topology exposes only the frontend SSR server;
  backend and MongoDB remain internal to the Compose network.
- Cognito is the approved next authentication authority. PantryList should keep
  local `users` only as app profile and ownership records, with `User.id`
  equal to the verified Cognito `sub`.
- Cognito is now the active authentication design in code. Local password
  registration, login, password reset, local JWT issuance, and local refresh
  sessions were removed from active source after the cleanup phase.
- A real Google/Facebook sign-in smoke test still requires AWS Cognito User
  Pool, app client, Hosted UI domain, callback/logout URLs, and social provider
  secrets configured outside git.
- If legacy imported pantry ownership must be claimed later, design a
  Cognito-native claim flow instead of restoring local password claims.
