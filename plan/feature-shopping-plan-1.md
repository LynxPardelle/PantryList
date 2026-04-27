---
goal: PantryList deterministic shopping plan from durability forecasts
version: 1.0
date_created: 2026-04-27
last_updated: 2026-04-27
owner: Codex
status: Completed
tags: [feature, planning, pantry, frontend, backend]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan adds a first deterministic shopping plan to PantryList by reusing the
existing product-type durability/depletion forecast. The feature gives users a
simple replenishment timeline without adding AI, scheduled jobs, AWS services,
or automatic inventory mutations.

## 1. Requirements & Constraints

- **REQ-001**: Add a `shoppingPlanItems` read-model collection to pantry
  overview.
- **REQ-002**: Include only product types with an active depletion rule.
- **REQ-003**: Sort shopping plan items by recommended purchase date, then
  product base name.
- **REQ-004**: Recommend a purchase date three days before the estimated
  depletion date, clamped to the current reference date when already due.
- **REQ-005**: Recommend a first-pass purchase quantity equal to one depletion
  interval's `consumeAmount`.
- **REQ-006**: Render the plan in the Angular pantry screen as a separate
  operational panel.
- **CON-001**: Do not add AI suggestions in this phase.
- **CON-002**: Do not add scheduled jobs or mutate lot quantities
  automatically.
- **CON-003**: Keep expiration, depletion, and shopping planning visually
  separate.
- **PAT-001**: Reuse `buildPantryOverview` and the existing backend read model.
- **PAT-002**: Follow the existing Angular service normalization and NgRx
  selector pattern.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Extend the backend read model and calculation.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `ShoppingPlanItem` and `ShoppingPlanUrgency` to `backend/src/application/read-models/pantry-overview.read-model.ts`. | ✅ | 2026-04-27 |
| TASK-002 | Add failing tests in `backend/src/application/utils/pantry-overview.builder.spec.ts` for sorted plan generation and no-rule exclusion. | ✅ | 2026-04-27 |
| TASK-003 | Implement shopping plan generation in `backend/src/application/utils/pantry-overview.builder.ts`. | ✅ | 2026-04-27 |
| TASK-004 | Add DTO and mapper output fields in `backend/src/infrastructure/http/dtos/pantry-overview-response.dto.ts` and `backend/src/infrastructure/http/mappers/pantry-overview.mapper.ts`. | ✅ | 2026-04-27 |

### Implementation Phase 2

- GOAL-002: Render the shopping plan in Angular.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Add shopping plan model types in `frontend/src/app/shared/models/pantry.model.ts`. | ✅ | 2026-04-27 |
| TASK-006 | Normalize `shoppingPlanItems` in `frontend/src/app/core/services/pantry.service.ts`. | ✅ | 2026-04-27 |
| TASK-007 | Add `selectShoppingPlanItems` to `frontend/src/app/store/pantry/pantry.selectors.ts`. | ✅ | 2026-04-27 |
| TASK-008 | Render a `Plan de compras` section in `frontend/src/app/features/pantry/pantry-page.component.html`. | ✅ | 2026-04-27 |
| TASK-009 | Add restrained UI styles in `frontend/src/styles.scss` or the pantry component stylesheet without exceeding style budgets. | ✅ | 2026-04-27 |
| TASK-010 | Add a frontend test that verifies the register flow still sends durability data and that shopping plan data can be displayed. | ✅ | 2026-04-27 |

### Implementation Phase 3

- GOAL-003: Verify and document the feature.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Run backend focused tests, backend lint, backend build, frontend tests, and frontend build. | ✅ | 2026-04-27 |
| TASK-012 | Update `README.md`, `findings.md`, and `progress.md` with the new shopping plan behavior and verification results. | ✅ | 2026-04-27 |

## 3. Alternatives

- **ALT-001**: Build a separate shopping-plan endpoint. Rejected for this pass
  because pantry overview already aggregates the required data.
- **ALT-002**: Generate AI-based purchase suggestions. Rejected because the
  user already preferred deterministic behavior first.
- **ALT-003**: Mutate inventory automatically when a plan item is due. Rejected
  because the approved durability model must remain read-time only.

## 4. Dependencies

- **DEP-001**: Existing `defaultDepletionRule` on `ProductType`.
- **DEP-002**: Existing `calculateDepletionForecast` service.
- **DEP-003**: Existing Angular pantry overview service and NgRx store.

## 5. Files

- **FILE-001**: `backend/src/application/read-models/pantry-overview.read-model.ts`
- **FILE-002**: `backend/src/application/utils/pantry-overview.builder.ts`
- **FILE-003**: `backend/src/application/utils/pantry-overview.builder.spec.ts`
- **FILE-004**: `backend/src/infrastructure/http/dtos/pantry-overview-response.dto.ts`
- **FILE-005**: `backend/src/infrastructure/http/mappers/pantry-overview.mapper.ts`
- **FILE-006**: `frontend/src/app/shared/models/pantry.model.ts`
- **FILE-007**: `frontend/src/app/core/services/pantry.service.ts`
- **FILE-008**: `frontend/src/app/store/pantry/pantry.selectors.ts`
- **FILE-009**: `frontend/src/app/features/pantry/pantry-page.component.html`
- **FILE-010**: `frontend/src/app/features/pantry/pantry-page.component.ts`
- **FILE-011**: `frontend/src/styles.scss`
- **FILE-012**: `README.md`
- **FILE-013**: `findings.md`
- **FILE-014**: `progress.md`

## 6. Testing

- **TEST-001**: Backend builder creates shopping plan items for active
  depletion rules.
- **TEST-002**: Backend builder excludes product types without active
  depletion rules from shopping plan items.
- **TEST-003**: Backend mapper exposes `shoppingPlanItems` in pantry overview
  responses.
- **TEST-004**: Angular pantry service normalizes shopping plan dates.
- **TEST-005**: Angular pantry component renders shopping plan data without
  breaking existing durability registration.

## 7. Risks & Assumptions

- **RISK-001**: A fixed three-day lead time is useful but may need per-product
  configuration later.
- **RISK-002**: `consumeAmount` as suggested purchase quantity is intentionally
  conservative and may not match real store package sizes.
- **ASSUMPTION-001**: A deterministic shopping plan is more valuable now than
  AWS/Cognito expansion because the local product loop is still maturing.
- **ASSUMPTION-002**: The current pantry overview payload can grow slightly
  without needing pagination for MVP data volumes.

## 8. Related Specifications / Further Reading

- `docs/superpowers/specs/2026-04-24-durability-depletion-design.md`
- `instructions.md`
