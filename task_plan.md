# Task Plan: PantryList AWS modernization and completion

## Goal
Review PantryList end to end, define an AWS-aligned target architecture that fits the current Angular + NestJS + MongoDB codebase, and then implement the approved path to move the project toward a production-ready state while exercising the newly installed skills.

## Current Phase
Phase 9

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

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `rg.exe` failed with access denied in this environment | 1 | Switched to `git ls-files` and native PowerShell file inspection |

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
- Production builds now use `environment.production.ts` with hydration enabled
  and NgRx DevTools disabled; development keeps hydration disabled to avoid
  Angular `NG0506` noise under `ng serve`.
