---
goal: Implement ProductType-Level Durability Depletion Forecasting
version: 1.0
date_created: 2026-04-24
last_updated: 2026-04-24
owner: Alec Jonathan Montano Romero
status: 'Planned'
tags: [feature, pantry, durability, depletion, inventory, angular, nestjs, mongodb]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan implements durability/depletion forecasting for PantryList. The feature adds deterministic ProductType-level consumption rules, calculates estimated current quantity at read time, excludes product types without active rules from depletion alerts, and keeps manual lot-level removals as the source of persisted inventory corrections.

## 1. Requirements & Constraints

- **REQ-001**: Add an optional durability/depletion rule to each `ProductType`.
- **REQ-002**: Store durability/depletion rules on product types only. Do not store durability/depletion rules on inventory lots.
- **REQ-003**: Exclude product types without an enabled durability/depletion rule from depletion alerts and depletion forecasts.
- **REQ-004**: Calculate estimated current quantity dynamically at read time. Do not run a background job that mutates lot quantities over time.
- **REQ-005**: Preserve lot-level manual removal. Manual removal must decrement the selected `InventoryLot.quantity`.
- **REQ-006**: Calculate `recordedAvailableQuantity` as the sum of current lot quantities for the product type.
- **REQ-007**: Calculate `completedIntervals` as the integer floor of elapsed time from `depletionRule.anchorDate` to the request time divided by the rule interval.
- **REQ-008**: Calculate `scheduledConsumedQuantity` as `completedIntervals * depletionRule.consumeAmount`.
- **REQ-009**: Calculate `estimatedCurrentQuantity` as `max(recordedAvailableQuantity - scheduledConsumedQuantity, 0)`.
- **REQ-010**: Add API response fields that let the frontend show registered quantity, estimated current quantity, depletion rule summary, and estimated depletion date.
- **REQ-011**: Add frontend controls for creating and editing the product-type durability/depletion rule.
- **REQ-012**: Add a visible depletion section in the pantry page separate from expiration warnings.
- **SEC-001**: Keep all product-type and inventory-lot queries scoped by authenticated or current MVP `userId`.
- **SEC-002**: Reject invalid depletion rule payloads with validation errors instead of coercing unsafe values.
- **CON-001**: Keep MongoDB as the active persistence layer for this feature pass.
- **CON-002**: Do not add AWS CDK, DynamoDB, Cognito, or Google login in this implementation plan.
- **CON-003**: Do not remove the existing expiration/caducity feature.
- **PAT-001**: Follow existing backend hexagonal structure under `backend/src/domain`, `backend/src/application`, and `backend/src/infrastructure`.
- **PAT-002**: Follow existing Angular standalone component and NgRx-auth patterns in `frontend/src/app`.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Add backend domain support for ProductType-level depletion rules.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Update `backend/src/domain/entities/product-type.entity.ts` to add `DepletionRule`, `DepletionPeriod`, and optional `depletionRule` fields on `ProductType`. Use `enabled`, `consumeAmount`, `unit`, `everyAmount`, `everyPeriod`, and `anchorDate` exactly as defined in the design spec. | | |
| TASK-002 | Update `backend/src/infrastructure/database/schemas/product-type.schema.ts` to persist the optional `depletionRule` embedded object with validated numeric and date fields. | | |
| TASK-003 | Update product-type mapper files under `backend/src/infrastructure/database/mappers/` so Mongo documents and domain entities round-trip the optional `depletionRule`. | | |
| TASK-004 | Update product-type create/update DTOs under `backend/src/infrastructure/http/dtos/` to validate optional `depletionRule` payloads with positive numeric values and allowed `everyPeriod` values `day`, `week`, and `month`. | | |
| TASK-005 | Update product-type controller/use-case paths so creating or saving a product type can persist the optional depletion rule without changing existing expiration behavior. | | |

### Implementation Phase 2

- GOAL-002: Add read-time depletion forecast calculations to pantry overview.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Add `backend/src/application/services/depletion-forecast.service.ts` with pure functions that calculate `recordedAvailableQuantity`, `completedIntervals`, `scheduledConsumedQuantity`, `estimatedCurrentQuantity`, and `estimatedDepletionDate`. | | |
| TASK-007 | Add unit tests in `backend/src/application/services/depletion-forecast.service.spec.ts` for monthly, weekly, partial-interval, zero-floor, disabled-rule, and missing-rule cases. | | |
| TASK-008 | Update `backend/src/application/use-cases/get-pantry-overview.use-case.ts` to include depletion fields for product types with enabled rules and no depletion fields for product types without enabled rules. | | |
| TASK-009 | Update the pantry overview response DTO or mapper files under `backend/src/infrastructure/http/` so the API returns registered and estimated quantities without mutating persisted lot quantity. | | |
| TASK-010 | Add or update backend tests for `GetPantryOverviewUseCase` to verify that manual lot quantity changes affect the next dynamic estimate. | | |

### Implementation Phase 3

- GOAL-003: Add frontend product-type durability configuration and depletion visibility.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Update `frontend/src/app/features/pantry/pantry.models.ts` to include depletion-rule request and response types that match the backend API. | | |
| TASK-012 | Update `frontend/src/app/features/pantry/pantry.service.ts` so product-type save payloads can include optional depletion rules. | | |
| TASK-013 | Update `frontend/src/app/features/pantry/pantry-page/pantry-page.component.ts` to manage depletion-rule form state for product types and keep the rule disabled by default. | | |
| TASK-014 | Update `frontend/src/app/features/pantry/pantry-page/pantry-page.component.html` to add product-type durability controls and a separate `Se agotan pronto` section. | | |
| TASK-015 | Update `frontend/src/app/features/pantry/pantry-page/pantry-page.component.scss` to make depletion warnings visually distinct from expiration warnings while preserving the current design system tokens. | | |
| TASK-016 | Update pantry component tests to cover creating a product type with a depletion rule, showing estimated current quantity, and excluding product types without depletion rules from the depletion section. | | |

### Implementation Phase 4

- GOAL-004: Verify, audit, and document the feature.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Run backend lint, unit tests, e2e tests, and build from `backend/`. | | |
| TASK-018 | Run frontend tests and build from `frontend/`. | | |
| TASK-019 | Run Docker Compose validation with the documented development env file. | | |
| TASK-020 | Run a browser smoke test on `http://localhost:4200` that creates a product type with durability, registers lots, manually removes one lot quantity, and verifies the dynamic estimate updates. | | |
| TASK-021 | Update `README.md`, `findings.md`, and `progress.md` with feature behavior, verification results, and residual risks. | | |

## 3. Alternatives

- **ALT-001**: Store durability rules per `InventoryLot`. Rejected because the approved product behavior requires durability at the product type level while lots only track actual available quantities and expiration dates.
- **ALT-002**: Mutate quantities with a scheduled background job. Rejected because dynamic read-time calculations are easier to audit, avoid hidden writes, and preserve manual lot adjustments as the persisted truth.
- **ALT-003**: Replace expiration with durability. Rejected because the product needs both caducity and durability; perishable foods can expire, and depletable supplies can run out through use.
- **ALT-004**: Add AWS CDK and DynamoDB in the same implementation. Rejected for this plan because cloud persistence is a separate architecture foundation and would expand the blast radius of the feature.

## 4. Dependencies

- **DEP-001**: Backend NestJS/Fastify application under `backend/`.
- **DEP-002**: MongoDB product-type persistence under `backend/src/infrastructure/database/`.
- **DEP-003**: Existing `ProductType` + `InventoryLot` model.
- **DEP-004**: Angular pantry page under `frontend/src/app/features/pantry/`.
- **DEP-005**: Existing Docker development stack in `docker-compose.yml`.

## 5. Files

- **FILE-001**: `backend/src/domain/entities/product-type.entity.ts` for domain rule types.
- **FILE-002**: `backend/src/infrastructure/database/schemas/product-type.schema.ts` for Mongo persistence.
- **FILE-003**: `backend/src/infrastructure/database/mappers/product-type.mapper.ts` for entity/document mapping.
- **FILE-004**: `backend/src/infrastructure/http/dtos/` for request validation.
- **FILE-005**: `backend/src/application/services/depletion-forecast.service.ts` for deterministic calculations.
- **FILE-006**: `backend/src/application/use-cases/get-pantry-overview.use-case.ts` for overview enrichment.
- **FILE-007**: `frontend/src/app/features/pantry/pantry.models.ts` for API models.
- **FILE-008**: `frontend/src/app/features/pantry/pantry.service.ts` for API payloads.
- **FILE-009**: `frontend/src/app/features/pantry/pantry-page/pantry-page.component.ts` for UI state.
- **FILE-010**: `frontend/src/app/features/pantry/pantry-page/pantry-page.component.html` for UI controls and warning sections.
- **FILE-011**: `frontend/src/app/features/pantry/pantry-page/pantry-page.component.scss` for visual treatment.
- **FILE-012**: `README.md`, `findings.md`, and `progress.md` for documentation.

## 6. Testing

- **TEST-001**: Unit-test depletion calculations for monthly and weekly rules.
- **TEST-002**: Unit-test depletion calculations when elapsed time is less than one full interval.
- **TEST-003**: Unit-test zero-floor behavior when scheduled consumption exceeds recorded quantity.
- **TEST-004**: Unit-test missing and disabled depletion rules are excluded from depletion forecasts.
- **TEST-005**: Backend use-case test verifies manual lot quantity adjustment changes the dynamic estimate.
- **TEST-006**: Backend DTO validation rejects negative, zero, unsupported-period, and missing-field depletion rules.
- **TEST-007**: Frontend component test verifies product-type durability controls can be submitted.
- **TEST-008**: Frontend component test verifies depletion section shows only product types with enabled rules.
- **TEST-009**: Browser smoke test verifies create, estimate, manual removal, and refreshed estimate end to end.

## 7. Risks & Assumptions

- **RISK-001**: Month-based interval calculations can be ambiguous around months with different day counts. Use calendar-month increments from `anchorDate` instead of fixed 30-day approximations.
- **RISK-002**: The current MVP identity model still depends on `userId` until JWT-backed authorization is fully enforced across all pantry endpoints.
- **RISK-003**: Dynamic estimates can surprise users if a product is manually adjusted long after the anchor date. The UI must show both registered and estimated quantities.
- **ASSUMPTION-001**: Existing lot `quantity` remains the persisted registered quantity after manual additions and removals.
- **ASSUMPTION-002**: Durability/depletion rules are optional and disabled unless the user explicitly enables them for a product type.
- **ASSUMPTION-003**: The feature uses the current MongoDB persistence layer and does not require a data migration for existing product types.

## 8. Related Specifications / Further Reading

- `docs/superpowers/specs/2026-04-24-durability-depletion-design.md`
- `docs/superpowers/specs/2026-04-21-expiration-lot-model-design.md`
- `plan/feature-expiration-lots-1.md`
