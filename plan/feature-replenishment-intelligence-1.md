---
goal: PantryList replenishment intelligence, per-type planning rules, archive flows, and guided UX
version: 1.0
date_created: 2026-04-29
last_updated: 2026-04-29
owner: Codex
status: Implemented
tags: [feature, pantry, replenishment, durability, ux, backend, frontend]
---

# Introduction

![Status: Implemented](https://img.shields.io/badge/status-Implemented-green)

This plan implements PantryList's next replenishment feature. The work makes
durability estimates use real purchase dates, keeps products in the shopping
plan after stock reaches zero, adds per-type planning overrides, exposes
purchase dates in the UI, improves user-facing copy, and adds safe archive and
delete flows for things users no longer want to track or buy.

Implementation note, 2026-04-29 Central Time:
- Runtime implementation is complete and verified in this repository.
- The frontend intentionally keeps archive/planning mutations component-local
  for this slice instead of adding a larger NgRx mutation state machine. The
  existing pantry store still owns overview loading, and mutations reload that
  overview after success.
- `/pantry` was moved behind a lazy `PantryModule` so the richer workspace does
  not push the initial production bundle over budget.

## 1. Requirements & Constraints

- **REQ-001**: Products with active planning rules must remain in
  `shoppingPlanItems` even when they have zero active lots.
- **REQ-002**: Durability forecasts must use each lot's `purchaseDate` as the
  preferred consumption start date and fall back to the product type rule
  `anchorDate`.
- **REQ-003**: `PantryLotSummary` and Angular pantry lot models must expose
  `purchaseDate`.
- **REQ-004**: Profile preferences must remain global defaults.
- **REQ-005**: Product types must support optional overrides for expiration
  warning days, depletion warning threshold ratio, shopping plan lead days, and
  planning enabled/disabled state.
- **REQ-006**: Product types and inventory lots must support soft archive,
  restore, and guarded permanent delete flows.
- **REQ-007**: Archived product types and archived lots must be excluded from
  active pantry overview, active search, expiration priority panels, depletion
  panels, and shopping plans.
- **REQ-008**: A dedicated archived-items surface must allow restore or guarded
  permanent delete.
- **REQ-009**: Shopping labels must be action-oriented: `Comprar ya`,
  `Comprar esta semana`, and `Comprar pronto`.
- **REQ-010**: Pantry guidance tips must be hideable for the current visit and
  disableable from profile preferences.
- **SEC-001**: All archive, restore, delete, and planning settings mutations
  must require existing Cognito auth and XSRF protection.
- **SEC-002**: Permanent delete must require an explicit confirmation payload
  that names the affected item.
- **CON-001**: Do not add AI, scheduled jobs, or automatic database mutation for
  time-based depletion in this slice.
- **CON-002**: Do not hard-delete active items by default; archive or pause
  planning must be the normal active-pantry action.
- **PAT-001**: Keep persistence behind existing repository/DAO boundaries so a
  future MongoDB swap remains feasible.
- **PAT-002**: Keep pantry overview as the read-model source of truth; Angular
  must not recalculate business thresholds locally.
- **PAT-003**: Follow `Hogar operativo` UX: calm action labels, progressive
  settings, and non-blocking guidance.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Extend backend domain models and persistence for planning settings,
  purchase-date summaries, archive state, and guidance defaults.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `ProductTypePlanningSettingsPrimitives` to `backend/src/domain/entities/product-type.entity.ts` with fields `planningEnabled`, `expirationWarningDaysOverride`, `depletionWarningThresholdRatioOverride`, and `shoppingPlanLeadDaysOverride`. Add validation matching profile preference ranges and default `planningEnabled` to `true` when a depletion rule is enabled. | | |
| TASK-002 | Add `archivedAt?: Date` and `archivedReason?: string` to `ProductTypePrimitives` in `backend/src/domain/entities/product-type.entity.ts`. Add methods `archive(reason?: string)`, `restore()`, and `isArchived()`. | | |
| TASK-003 | Add `archivedAt?: Date` and `archivedReason?: string` to `InventoryLotPrimitives` in `backend/src/domain/entities/inventory-lot.entity.ts`. Add methods `archive(reason?: string)`, `restore()`, and `isArchived()`. | | |
| TASK-004 | Extend `UserPreferencesPrimitives` in `backend/src/domain/value-objects/user-preferences.vo.ts` with `showGuidanceTips: boolean` defaulting to `true`, and update validation, profile DTOs, mapper output, and tests. | | |
| TASK-005 | Extend Mongo schemas `backend/src/infrastructure/database/mongodb/schemas/product-type.schema.ts` and `backend/src/infrastructure/database/mongodb/schemas/inventory-lot.schema.ts` with planning settings and archive fields. | | |
| TASK-006 | Update Mongo repositories `mongodb-product-type.repository.ts` and `mongodb-inventory-lot.repository.ts` to persist new fields and exclude archived records from normal `findByUserId`, `findByProductTypeId`, and search flows. Add dedicated archived lookup methods. | | |
| TASK-007 | Add backend unit tests proving archived product types and lots are excluded from active repository queries and can be restored. | | |

### Implementation Phase 2

- GOAL-002: Rebuild pantry overview around active product types, lot-level
  purchase-date depletion, effective settings, and zero-stock shopping plans.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Extend `PantryLotSummary` in `backend/src/application/read-models/pantry-overview.read-model.ts` with `purchaseDate?: Date`. Update response DTOs and `PantryOverviewMapper.toLotSummaryResponse`. | | |
| TASK-009 | Add `effectivePreferences` or `planningSettings` metadata to `PantryOverviewItem` and `ShoppingPlanItem` so frontend can show inherited defaults and overrides without recalculating. | | |
| TASK-010 | Update `backend/src/application/services/depletion-forecast.service.ts` to support lot-level forecasting from a provided start date. Keep existing product-level helper if needed, but add a deterministic group helper that sums estimated remaining quantities across lots. | | |
| TASK-011 | Refactor `buildPantryOverview` in `backend/src/application/utils/pantry-overview.builder.ts` to iterate active product types first, attach active lots, and create zero-stock groups for active planned types. | | |
| TASK-012 | Resolve effective settings per product type by combining `UserPreferences` defaults with product-type overrides before expiration, depletion, and shopping calculations. | | |
| TASK-013 | Update shopping urgency calculation in `pantry-overview.builder.ts`: `depleted` when estimated quantity is `<= 0` or active stock is zero; `critical` when recommended purchase date is due or estimated depletion is within 7 calendar days; `upcoming` when purchase is inside the lead window but not critical. | | |
| TASK-014 | Add backend tests in `backend/src/application/utils/pantry-overview.builder.spec.ts` for monthly detergent bought one month ago, zero-stock planned product, per-type lead-day override, archived exclusion, purchase-date mapping, and shopping urgency labels. | | |

### Implementation Phase 3

- GOAL-003: Add backend mutation APIs for per-type settings, archive/restore,
  permanent delete, and archived item discovery.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | Add `UpdateProductTypePlanningSettingsUseCase` under `backend/src/application/use-cases/` to patch planning settings for one user-owned product type. | | |
| TASK-016 | Add `ArchiveProductTypeUseCase`, `RestoreProductTypeUseCase`, and `DeleteProductTypeUseCase` under `backend/src/application/use-cases/`. Delete must reject active, non-archived product types and require confirmation text equal to the product base name. | | |
| TASK-017 | Add `ArchiveInventoryLotUseCase`, `RestoreInventoryLotUseCase`, and `DeleteInventoryLotUseCase` under `backend/src/application/use-cases/`. Delete must reject active, non-archived lots and require confirmation text equal to the lot display name or fallback lot id. | | |
| TASK-018 | Add archived item read model and use case, for example `GetArchivedPantryItemsUseCase`, returning archived product types and lots owned by the current user. | | |
| TASK-019 | Extend `backend/src/infrastructure/http/controllers/product-types.controller.ts` with `PATCH /:id/planning-settings`, `POST /:id/archive`, `POST /:id/restore`, and `DELETE /:id`. | | |
| TASK-020 | Extend `backend/src/infrastructure/http/controllers/inventory-lots.controller.ts` with `POST /:id/archive`, `POST /:id/restore`, and `DELETE /:id`. | | |
| TASK-021 | Add `GET /api/pantry/archived` in the pantry controller or a dedicated controller to return archived items. | | |
| TASK-022 | Add DTOs for planning settings, archive reason, and permanent-delete confirmation in `backend/src/infrastructure/http/dtos/`. Validate all numeric ranges and confirmation text. | | |
| TASK-023 | Register new use cases in `backend/src/app.module.ts` and add controller/use-case tests for auth-owned success, cross-user `404`, validation `400`, archive, restore, and delete guard paths. | | |

### Implementation Phase 4

- GOAL-004: Update Angular models, services, store, and copy to consume the new
  backend contract.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-024 | Extend `frontend/src/app/shared/models/pantry.model.ts` with `purchaseDate`, product-type planning settings, effective preferences, archived item models, and updated shopping urgency labels. | | |
| TASK-025 | Update `frontend/src/app/core/services/pantry.service.ts` to normalize purchase dates, planning settings, archived item responses, and to add methods for planning settings, archive, restore, and delete APIs. | | |
| TASK-026 | Add NgRx actions/effects/reducer handling for archive, restore, delete, planning settings save, and archived item loading in `frontend/src/app/store/pantry/`. | | |
| TASK-027 | Update selectors in `frontend/src/app/store/pantry/pantry.selectors.ts` for archived items, saving states, and refreshed pantry overview after mutations. | | |
| TASK-028 | Update `frontend/src/app/shared/models/profile.model.ts`, `frontend/src/app/core/services/profile.service.ts`, and profile tests for `showGuidanceTips`. | | |
| TASK-029 | Update `frontend/src/app/features/profile/profile-page.component.*` to explain profile values as defaults and add a `Mostrar ayudas de PantryList` toggle plus an `Elementos archivados` entry point. | | |

### Implementation Phase 5

- GOAL-005: Improve pantry UI behavior, user copy, guidance, and safe removal
  flows.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-030 | Rename pantry panel copy in `frontend/src/app/features/pantry/pantry-page.component.html`: use `Qué revisar primero`, `Por acabarse`, `Compras sugeridas`, `Despensa por tipo`, and `Reglas de este tipo`. | | |
| TASK-031 | Render `Comprado el <date>` for each lot when `purchaseDate` exists and render fallback copy when durability is active but purchase date is missing. | | |
| TASK-032 | Update shopping urgency copy in `PantryPageComponent`: `depleted` -> `Comprar ya`, `critical` -> `Comprar esta semana`, `upcoming` -> `Comprar pronto`. | | |
| TASK-033 | Add product-type planning settings UI inside each expanded pantry group with inherited default labels and optional override controls. | | |
| TASK-034 | Add archive/pause actions to lot rows, product-type groups, and shopping plan items. Use confirmation UI that names the target item and explains the consequence. | | |
| TASK-035 | Add an archived-items UI surface reachable from profile or pantry. It must list archived types/lots and support restore plus guarded permanent delete. | | |
| TASK-036 | Add inline guidance cards to registration, durability, shopping, and archive areas. Implement `Ocultar por ahora` as local component state and `No volver a mostrar` through profile preferences. | | |
| TASK-037 | Update `frontend/src/styles.scss` and pantry/profile component styles to support the new states without exceeding Angular style budgets and without using banned AI-design patterns such as thick side stripes. | | |

### Implementation Phase 6

- GOAL-006: Verify behavior end-to-end and document results.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-038 | Run targeted backend tests for domain entities, repositories, planning settings use cases, archive use cases, and pantry overview builder. | | |
| TASK-039 | Run full backend test suite, backend build, and backend production dependency audit. | | |
| TASK-040 | Run frontend unit tests and frontend production build. | | |
| TASK-041 | Rebuild/restart Docker app profile using `.env.docker.local` and verify backend health plus frontend `http://localhost:48673`. | | |
| TASK-042 | Add Playwright E2E coverage for monthly item bought one month ago, zero-stock planned shopping item, archive/restore, and guidance hide/disable behavior. | | |
| TASK-043 | Run `$env:E2E_BASE_URL='http://localhost:48673'; npm run test:e2e` in `frontend/`. | | |
| TASK-044 | Run `python C:\Users\lince\.codex\skills\security-compliance\scripts\secret_scan.py . --json` and production `npm audit --omit=dev --json` for changed runtime packages. | | |
| TASK-045 | Update `README.md`, `findings.md`, `progress.md`, and `task_plan.md` with implemented behavior, known limits, and verification outputs. | | |

## 3. Alternatives

- **ALT-001**: Keep the current lot-first overview and add fake zero-quantity
  lots. Rejected because it pollutes inventory and confuses real stock.
- **ALT-002**: Hard delete active records when the user no longer wants an item.
  Rejected because it is too easy to lose history and planning context.
- **ALT-003**: Add per-lot overrides for every threshold in this slice.
  Rejected because product-type overrides solve the current use cases with much
  less UI complexity.
- **ALT-004**: Add scheduled background jobs to decrement quantities
  automatically. Rejected because the approved model is deterministic read-time
  forecasting plus manual correction.

## 4. Dependencies

- **DEP-001**: Existing `ProductType.defaultDepletionRule`.
- **DEP-002**: Existing `InventoryLot.purchaseDate`.
- **DEP-003**: Existing `UserPreferences` profile defaults.
- **DEP-004**: Existing Cognito-backed auth guard and XSRF mutation protection.
- **DEP-005**: Existing NgRx pantry overview load and refresh flow.
- **DEP-006**: Existing Docker app profile on frontend port `48673` and backend
  port `39173`.

## 5. Files

- **FILE-001**: `backend/src/domain/entities/product-type.entity.ts`
- **FILE-002**: `backend/src/domain/entities/inventory-lot.entity.ts`
- **FILE-003**: `backend/src/domain/value-objects/user-preferences.vo.ts`
- **FILE-004**: `backend/src/domain/repositories/product-type.repository.ts`
- **FILE-005**: `backend/src/domain/repositories/inventory-lot.repository.ts`
- **FILE-006**: `backend/src/application/services/depletion-forecast.service.ts`
- **FILE-007**: `backend/src/application/utils/pantry-overview.builder.ts`
- **FILE-008**: `backend/src/application/utils/pantry-overview.builder.spec.ts`
- **FILE-009**: `backend/src/application/read-models/pantry-overview.read-model.ts`
- **FILE-010**: `backend/src/application/use-cases/update-product-type-planning-settings.use-case.ts`
- **FILE-011**: `backend/src/application/use-cases/archive-product-type.use-case.ts`
- **FILE-012**: `backend/src/application/use-cases/restore-product-type.use-case.ts`
- **FILE-013**: `backend/src/application/use-cases/delete-product-type.use-case.ts`
- **FILE-014**: `backend/src/application/use-cases/archive-inventory-lot.use-case.ts`
- **FILE-015**: `backend/src/application/use-cases/restore-inventory-lot.use-case.ts`
- **FILE-016**: `backend/src/application/use-cases/delete-inventory-lot.use-case.ts`
- **FILE-017**: `backend/src/application/use-cases/get-archived-pantry-items.use-case.ts`
- **FILE-018**: `backend/src/infrastructure/database/mongodb/schemas/product-type.schema.ts`
- **FILE-019**: `backend/src/infrastructure/database/mongodb/schemas/inventory-lot.schema.ts`
- **FILE-020**: `backend/src/infrastructure/database/mongodb/mongodb-product-type.repository.ts`
- **FILE-021**: `backend/src/infrastructure/database/mongodb/mongodb-inventory-lot.repository.ts`
- **FILE-022**: `backend/src/infrastructure/http/controllers/product-types.controller.ts`
- **FILE-023**: `backend/src/infrastructure/http/controllers/inventory-lots.controller.ts`
- **FILE-024**: `backend/src/infrastructure/http/controllers/pantry.controller.ts`
- **FILE-025**: `backend/src/infrastructure/http/dtos/update-product-type-planning-settings.dto.ts`
- **FILE-026**: `backend/src/infrastructure/http/dtos/archive-pantry-item.dto.ts`
- **FILE-027**: `backend/src/infrastructure/http/dtos/delete-pantry-item.dto.ts`
- **FILE-028**: `backend/src/infrastructure/http/mappers/pantry-overview.mapper.ts`
- **FILE-029**: `backend/src/app.module.ts`
- **FILE-030**: `frontend/src/app/shared/models/pantry.model.ts`
- **FILE-031**: `frontend/src/app/shared/models/profile.model.ts`
- **FILE-032**: `frontend/src/app/core/services/pantry.service.ts`
- **FILE-033**: `frontend/src/app/core/services/profile.service.ts`
- **FILE-034**: `frontend/src/app/store/pantry/pantry.actions.ts`
- **FILE-035**: `frontend/src/app/store/pantry/pantry.effects.ts`
- **FILE-036**: `frontend/src/app/store/pantry/pantry.reducer.ts`
- **FILE-037**: `frontend/src/app/store/pantry/pantry.selectors.ts`
- **FILE-038**: `frontend/src/app/features/pantry/pantry-page.component.ts`
- **FILE-039**: `frontend/src/app/features/pantry/pantry-page.component.html`
- **FILE-040**: `frontend/src/app/features/pantry/pantry-page.component.scss`
- **FILE-041**: `frontend/src/app/features/profile/profile-page.component.ts`
- **FILE-042**: `frontend/src/app/features/profile/profile-page.component.html`
- **FILE-043**: `frontend/src/app/features/profile/profile-page.component.scss`
- **FILE-044**: `frontend/src/styles.scss`
- **FILE-045**: `frontend/e2e/replenishment-intelligence.spec.ts`
- **FILE-046**: `README.md`
- **FILE-047**: `findings.md`
- **FILE-048**: `progress.md`
- **FILE-049**: `task_plan.md`

## 6. Testing

- **TEST-001**: Backend domain tests for product type planning settings and
  archive/restore validation.
- **TEST-002**: Backend domain tests for inventory lot archive/restore.
- **TEST-003**: Backend repository tests for excluding archived records from
  active queries and listing archived records separately.
- **TEST-004**: Backend overview test for a one-liter monthly item bought one
  month ago estimating zero remaining.
- **TEST-005**: Backend overview test for a zero-stock active planned product
  appearing in `shoppingPlanItems` as `depleted`.
- **TEST-006**: Backend overview test for product-type overrides replacing
  profile defaults.
- **TEST-007**: Backend controller/use-case tests for planning settings, archive,
  restore, and guarded delete.
- **TEST-008**: Frontend service tests for normalizing `purchaseDate`,
  planning settings, and archived items.
- **TEST-009**: Frontend pantry component tests for purchase date display,
  action labels, and inherited override copy.
- **TEST-010**: Frontend profile component tests for `showGuidanceTips` and
  archived-items entry point.
- **TEST-011**: Playwright E2E for monthly purchase aging into `Comprar ya`.
- **TEST-012**: Playwright E2E for final manual consumption keeping the product
  in shopping plan.
- **TEST-013**: Playwright E2E for pausing/archiving a product type removing it
  from shopping plan.
- **TEST-014**: Playwright E2E for guidance hide-for-now and disable behavior.

## 7. Risks & Assumptions

- **RISK-001**: Product-type-first overview can reveal product types with no
  active lots; UI copy must make zero stock look intentional, not broken.
- **RISK-002**: Recorded stock and estimated stock can diverge. UI must explain
  that manual consumption corrects real-life usage while durability provides an
  estimate.
- **RISK-003**: Soft archive increases query complexity. Repository tests must
  enforce active vs archived behavior.
- **RISK-004**: Delete endpoints are destructive. Confirmation text and archived
  precondition are required to reduce accidental loss.
- **ASSUMPTION-001**: Product-type overrides are enough for this slice; per-lot
  overrides are deferred.
- **ASSUMPTION-002**: A fixed seven-day `Comprar esta semana` window is clearer
  than tying the phrase to a configurable lead-day value.
- **ASSUMPTION-003**: Archived item restore/delete can live in profile or a
  profile-linked surface for MVP.

## 8. Related Specifications / Further Reading

- `docs/superpowers/specs/2026-04-24-durability-depletion-design.md`
- `docs/superpowers/specs/2026-04-28-profile-preferences-expired-alerts-design.md`
- `docs/superpowers/specs/2026-04-29-replenishment-intelligence-guided-ux-design.md`
- `plan/feature-shopping-plan-1.md`
- `.impeccable.md`
