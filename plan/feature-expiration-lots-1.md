---
goal: PantryList ProductType and InventoryLot Implementation Plan
version: 1.0
date_created: 2026-04-21
last_updated: 2026-04-21
owner: Codex
status: In progress
tags: [feature, architecture, migration, inventory, expiration, angular, nestjs, mongodb, fastify]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In_progress-yellow)

Implement the approved `ProductType` + `InventoryLot` model for PantryList so
the application can track grouped household inventory with lot-level expiration
dates, explicit consume-by-lot behavior, aggregated pantry overview data, and a
conservative migration path from the current flat `Product` model.

## 1. Requirements & Constraints

- **REQ-001**: Replace the current flat inventory assumptions with a scalable
  model composed of `ProductType` and `InventoryLot`.
- **REQ-002**: Support multiple lots with different expiration dates under the
  same base type.
- **REQ-003**: Preserve the user-approved rule that consumption must require an
  explicit lot choice and must not auto-select the earliest-expiring lot.
- **REQ-004**: Provide an aggregated pantry overview endpoint that groups lots
  by base type and includes expiration visibility.
- **REQ-005**: Replace the current flat pantry UI with grouped pantry cards,
  expiring-soon visibility, and consume-by-lot actions.
- **REQ-006**: Preserve existing PantryList data through a conservative
  migration that creates one initial lot per current flat product without
  inventing expiration history.
- **REQ-007**: Keep the implementation compatible with the current local stack:
  Angular 19, NestJS 11, Fastify, MongoDB, NgRx, and Docker-backed local Mongo.
- **REQ-008**: Repair or install `node` inside WSL `Ubuntu` so the
  brainstorming visual companion can be retried after implementation planning.
- **SEC-001**: Continue validating user input at DTO boundaries and reject
  invalid quantities, invalid type references, and invalid lot consumption.
- **SEC-002**: Keep MongoDB credentials in ignored local env files only; do not
  introduce secrets into tracked files.
- **CON-001**: The first version must keep one canonical `defaultUnit` on each
  `ProductType` and require lot units to match it; cross-unit conversion is out
  of scope.
- **CON-002**: Suggestions for existing product types must remain deterministic
  and non-AI in this phase.
- **CON-003**: The existing worktree is dirty; implementation must avoid
  reverting unrelated user changes.
- **GUD-001**: Follow the approved design in
  `docs/superpowers/specs/2026-04-21-expiration-lot-model-design.md`.
- **PAT-001**: Prefer backend-generated read models for grouped pantry and
  expiration summaries instead of rebuilding aggregation logic in Angular.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Prepare the environment, planning artifacts, and backend domain
  boundaries needed for the new scalable inventory model.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create or update durable context in `C:\Users\lince\Documents\GitHub\Codex\Codex.md` to capture the approved `ProductType` + `InventoryLot` direction, explicit consume-by-lot rule, and WSL node repair requirement. | ✅ | 2026-04-21 |
| TASK-002 | Repair or install `node` inside `wsl -d Ubuntu` and verify with `which node` and `node -v`; if successful, retry the brainstorming visual companion server under `C:\Users\lince\Documents\GitHub\PantryList\.superpowers\brainstorm\`. | ✅ | 2026-04-21 |
| TASK-003 | Introduce new domain enums, entities, value objects, and repository contracts under `backend/src/domain/` for `ProductType`, `InventoryLot`, expiration status classification, and consume validation without deleting the old flat `Product` model yet. | ✅ | 2026-04-21 |
| TASK-004 | Add new dependency injection tokens and wire new repository interfaces in `backend/src/application/tokens.ts` and `backend/src/app.module.ts` while preserving the current boot path. | ✅ | 2026-04-21 |
| TASK-005 | Define Mongo schemas and repository implementations for `product_types` and `inventory_lots` under `backend/src/infrastructure/database/mongodb/`, including indexes for `userId`, `productTypeId`, and `expiresAt`. | ✅ | 2026-04-21 |

### Implementation Phase 2

- **GOAL-002**: Implement backend application workflows and HTTP APIs for base
  types, lots, grouped pantry overview, and explicit lot consumption.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Add application commands, query models, and use cases under `backend/src/application/` for create/search product types, create lots, consume lots, get expiring lots, and get pantry overview. | ✅ | 2026-04-21 |
| TASK-007 | Add DTOs, controllers, and mappers under `backend/src/infrastructure/http/` for `POST /product-types`, `GET /product-types`, `GET /product-types/:id`, `POST /inventory-lots`, `GET /inventory-lots`, `GET /inventory-lots/expiring`, `POST /inventory-lots/:id/consume`, and `GET /pantry/overview`. | ✅ | 2026-04-21 |
| TASK-008 | Implement expiration classification logic in the backend using the approved thresholds (`critical <= 3 days`, `soon <= 7 days`, `stable > 7 days`, `none`) and expose that classification through response DTOs used by the overview and expiring endpoints. | ✅ | 2026-04-21 |
| TASK-009 | Preserve or deprecate the current `/products` endpoints intentionally: either keep them temporarily for migration-only compatibility or retire them from the frontend path once the new API is live; document the chosen compatibility behavior in `README.md`. | ✅ | 2026-04-21 |
| TASK-010 | Add backend tests for the new domain behavior, repositories, use cases, and HTTP flows in `backend/src/**` specs and `backend/test/app.e2e-spec.ts` or new e2e files. | ✅ | 2026-04-22 |

### Implementation Phase 3

- **GOAL-003**: Migrate current persisted data from the flat product model to
  the new scalable collections without fabricating historical expiration data.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Create a deterministic migration script under `backend/scripts/` or `Guides/Scripts/` that reads the current `products` collection and creates one `ProductType` and one `InventoryLot` per record with `expiresAt = null`. | ✅ | 2026-04-21 |
| TASK-012 | Add migration guards so rerunning the migration does not duplicate already migrated product types or lots for the same legacy product identifier. | ✅ | 2026-04-21 |
| TASK-013 | Document migration execution steps and rollback expectations in `README.md` and, if needed, a dedicated migration note under `docs/`. | ✅ | 2026-04-21 |
| TASK-014 | Run the migration against the local Docker-backed MongoDB used by PantryList, then verify that the new overview endpoint reflects migrated inventory correctly. | ✅ | 2026-04-21 |

### Implementation Phase 4

- **GOAL-004**: Replace the Angular flat pantry experience with grouped pantry,
  expiring inventory visibility, and consume-by-lot flows backed by the new API.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | Replace `frontend/src/app/shared/models/product.model.ts` with models oriented around `ProductType`, `InventoryLot`, `PantryOverview`, `ExpiringGroup`, `CreateProductTypeRequest`, `CreateInventoryLotRequest`, and `ConsumeInventoryLotRequest`. | ✅ | 2026-04-21 |
| TASK-016 | Replace the current `ProductService` in `frontend/src/app/core/services/product.service.ts` with a pantry-focused service layer that calls the new endpoints and normalizes grouped overview and lot response dates. | ✅ | 2026-04-21 |
| TASK-017 | Refactor NgRx state in `frontend/src/app/store/product/` so actions, reducer, effects, selectors, and state represent grouped pantry data, expiring groups, type suggestions, and consume-by-lot flows instead of flat product CRUD. | ✅ | 2026-04-21 |
| TASK-018 | Replace the current pantry page implementation in `frontend/src/app/features/pantry/` with a two-zone layout: an expiring panel and a grouped pantry list with expandable lots, guided type selection, and a register-lot form. | ✅ | 2026-04-21 |
| TASK-019 | Remove or deprecate direct aggregate quantity controls such as `+1`, `-1`, and manual flat quantity saves, replacing them with a lot selection and consume flow. | ✅ | 2026-04-21 |
| TASK-020 | Add or update Angular component tests and selector tests for grouped overview rendering, expiring summaries, type suggestion behavior, and explicit lot consumption. | ✅ | 2026-04-21 |

### Implementation Phase 5

- **GOAL-005**: Verify the full user workflow on the local stack and document
  the resulting behavior and remaining future work.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | Run backend verification commands in `backend/`: `npm run lint`, `npm test`, `npm run test:e2e`, and `npm run build`. | ✅ | 2026-04-21 |
| TASK-022 | Run frontend verification commands in `frontend/`: `npm test` and `npm run build`. | ✅ | 2026-04-21 |
| TASK-023 | Bring up local MongoDB with Docker, execute a smoke test that creates at least one product type and multiple lots with different expiration dates, consumes from a chosen lot, and verifies grouped expiry visibility in both API and UI. | ✅ | 2026-04-21 |
| TASK-024 | Use relevant installed skills after implementation for validation, specifically `code-reviewer` or `comprehensive-review` for a structured pass and `agent-browser` if WSL node repair makes the visual/browser tooling path viable; if a skill fails, record the exact failure instead of substituting guesses. | ✅ | 2026-04-21 |
| TASK-025 | Update `README.md`, `progress.md`, `findings.md`, and `C:\Users\lince\Documents\GitHub\Codex\Codex.md` with the final architecture, migration notes, smoke test results, skill-evaluation findings, and future-feature backlog references. | ✅ | 2026-04-21 |

## 3. Alternatives

- **ALT-001**: Keep extending the current flat `Product` model with expiration
  fields. Rejected because it does not scale to multiple expiration groups under
  the same base type and makes grouped consumption behavior awkward.
- **ALT-002**: Store one product per lot with no explicit `ProductType`
  collection. Rejected because it weakens long-term scalability for grouping,
  planning, reporting, and normalized type suggestions.
- **ALT-003**: Auto-consume from the earliest-expiring lot. Rejected because
  the user explicitly requested manual lot choice to reinforce expiration
  awareness.

## 4. Dependencies

- **DEP-001**: Existing local MongoDB flow defined by `docker-compose.yml` and
  `backend/.env`.
- **DEP-002**: Existing NestJS Fastify boot path in `backend/src/app.module.ts`
  and `backend/src/main.ts`.
- **DEP-003**: Existing Angular NgRx application shell under
  `frontend/src/app/`.
- **DEP-004**: Approved design specification in
  `docs/superpowers/specs/2026-04-21-expiration-lot-model-design.md`.
- **DEP-005**: Installed skills that may be used during implementation or
  verification, especially `create-implementation-plan`, `code-reviewer`,
  `comprehensive-review`, `frontend-skill`, and `agent-browser`.

## 5. Files

- **FILE-001**: `backend/src/app.module.ts` - register new schemas, repositories,
  and use cases.
- **FILE-002**: `backend/src/application/tokens.ts` - add DI tokens for
  product type and lot repositories/services.
- **FILE-003**: `backend/src/domain/` - add entities, enums, repositories,
  and supporting logic for `ProductType` and `InventoryLot`.
- **FILE-004**: `backend/src/infrastructure/database/mongodb/` - add schemas,
  repositories, and migration support.
- **FILE-005**: `backend/src/infrastructure/http/controllers/` - add product
  type, inventory lot, and pantry overview controllers.
- **FILE-006**: `backend/src/infrastructure/http/dtos/` - add request and
  response DTOs for the new API surface.
- **FILE-007**: `backend/src/infrastructure/http/mappers/` - map domain and
  read models to API DTOs.
- **FILE-008**: `backend/test/` and `backend/src/**/*.spec.ts` - add and update
  backend tests.
- **FILE-009**: `frontend/src/app/shared/models/product.model.ts` - replace the
  flat product shape with grouped pantry-oriented models or split into new
  files if clearer.
- **FILE-010**: `frontend/src/app/core/services/product.service.ts` - replace
  flat product API calls with pantry overview, type, lot, and consume endpoints.
- **FILE-011**: `frontend/src/app/store/product/` - refactor actions, reducer,
  effects, selectors, and state for grouped pantry behavior.
- **FILE-012**: `frontend/src/app/features/pantry/` - replace the current flat
  pantry UI with grouped pantry and expiring flows.
- **FILE-013**: `frontend/src/app/core/services/session.service.ts` and route
  wiring - keep the username session flow compatible with the new API calls.
- **FILE-014**: `README.md` - document the new model, endpoints, migration, and
  smoke test.
- **FILE-015**: `plan/feature-expiration-lots-1.md` - this implementation plan.
- **FILE-016**: `docs/superpowers/specs/2026-04-21-expiration-lot-model-design.md`
  - approved design source.

## 6. Testing

- **TEST-001**: Verify expiration status classification logic for `critical`,
  `soon`, `stable`, and `none`.
- **TEST-002**: Verify consume-by-lot rejects quantities greater than the
  available lot quantity.
- **TEST-003**: Verify pantry overview groups lots correctly by `ProductType`
  and reports `totalQuantity`, `lotCount`, `nextExpirationAt`, and
  `expiringSoonQuantity`.
- **TEST-004**: Verify deterministic migration creates one `ProductType` and
  one `InventoryLot` from each legacy flat `Product`.
- **TEST-005**: Verify the Angular store derives grouped pantry and expiring UI
  data correctly from normalized API responses.
- **TEST-006**: Verify the UI no longer allows aggregate quantity updates
  without selecting a lot.
- **TEST-007**: Verify the local smoke test flow against Docker MongoDB using
  at least two lots under the same base type with different expiration dates.
- **TEST-008**: Verify WSL `node` availability after repair with exact command
  output from `wsl -d Ubuntu bash -lc 'which node; node -v'`.

## 7. Risks & Assumptions

- **RISK-001**: Replacing the current flat product flow touches both backend and
  frontend deeply, so incomplete migration handling can leave the UI without
  visible inventory.
- **RISK-002**: The current worktree already contains many local changes; broad
  refactors can conflict with in-progress files if edits are not kept surgical.
- **RISK-003**: WSL node repair may require package installation or shell-path
  changes that behave differently from the Windows host environment.
- **RISK-004**: `agent-browser` may still fail for reasons unrelated to WSL
  node if other environment constraints remain.
- **ASSUMPTION-001**: The current MongoDB instance in Docker remains available
  locally at `127.0.0.1:27017` during implementation and smoke testing.
- **ASSUMPTION-002**: Username-only session flow remains sufficient for this
  implementation phase.
- **ASSUMPTION-003**: The old flat `Product` endpoints may remain in the code
  temporarily during transition, but the new frontend path will target the new
  API surface once available.

## 8. Related Specifications / Further Reading

- `docs/superpowers/specs/2026-04-21-expiration-lot-model-design.md`
- `README.md`
- `backend/src/domain/entities/product.entity.ts`
- `backend/src/infrastructure/database/mongodb/schemas/product.schema.ts`
- `frontend/src/app/features/pantry/pantry-page.component.ts`
