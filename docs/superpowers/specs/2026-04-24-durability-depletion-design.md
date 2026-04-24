# PantryList Durability And Depletion Forecasting Design

Date: 2026-04-24
Status: Approved in chat and ready for implementation planning

## Context

This design was created from:

- The current PantryList lot model in:
  - `backend/src/domain/entities/product-type.entity.ts`
  - `backend/src/domain/entities/inventory-lot.entity.ts`
  - `backend/src/application/use-cases/get-pantry-overview.use-case.ts`
  - `frontend/src/app/features/pantry/pantry-page.component.html`
- The approved expiration-lot design in
  `docs/superpowers/specs/2026-04-21-expiration-lot-model-design.md`
- The user conversation on 2026-04-24 about durability for products that are
  depleted over time

## Problem

PantryList currently models visible pantry pressure mainly through expiration
dates and explicit lot consumption. That works well for products that expire,
but it does not model household items that are gradually depleted on a
predictable cadence.

Examples clarified by the user:

- Detergent may deplete at `1 lt` per month.
- Shampoo may deplete at `0.5 lt` every `2 months`.
- If the household owns `5 lt` of soap with a `1 lt / month` durability rule,
  after three months PantryList should estimate `2 lt` remaining.
- If one extra liter is manually removed because it was given away, PantryList
  should estimate `1 lt` remaining.

The user also clarified that durability must live at the product-type level,
not at a specific lot level. A lot only participates in depletion forecasting
when its parent `ProductType` has an active durability rule.

## Goals

- Add optional durability rules to `ProductType`.
- Calculate estimated depletion dynamically during reads.
- Keep expiration and durability as separate concepts.
- Exclude product types without durability rules from depletion forecasting.
- Allow manual lot-level quantity removal for real-world corrections, gifts,
  usage, loss, or inventory adjustments.
- Keep the first version explainable with a fixed rule:
  `X units every Y period`.
- Avoid scheduled jobs or automatic persistent stock mutations in this phase.
- Prepare the model for a later AWS CDK and DynamoDB foundation.

## Non-Goals

- No per-lot durability rule in this phase.
- No automatic background job that mutates quantities over time.
- No pro-rated daily depletion in this phase.
- No AI-based durability suggestions in this phase.
- No Cognito or Google login integration in this phase.
- No migration from MongoDB to DynamoDB in this phase.

## Core Decision

Durability is configured on `ProductType`.

`InventoryLot` remains the place where actual registered quantity lives. The
system calculates estimated current quantity by combining:

- the current persisted lot quantities for the type
- the product-type durability rule
- the elapsed full intervals since the rule anchor date

This keeps the durable rule as a reusable product-type behavior while preserving
manual lot operations for real inventory corrections.

## Domain Model

### ProductType

Add an optional `defaultDepletionRule`.

Suggested shape:

```ts
interface DepletionRule {
  enabled: boolean;
  consumeAmount: number;
  unit: QuantityUnit;
  everyAmount: number;
  everyPeriod: 'day' | 'week' | 'month';
  anchorDate: Date;
}
```

Rules:

- If `defaultDepletionRule` is missing or disabled, the product type does not
  participate in depletion forecasting.
- `consumeAmount` must be greater than `0`.
- `everyAmount` must be greater than `0`.
- `unit` must match `ProductType.defaultUnit`.
- `anchorDate` is required when the rule is enabled.
- The rule applies to the aggregate quantity of all lots under the product
  type.

### InventoryLot

No depletion rule is added to `InventoryLot` in this phase.

Current lot quantity remains the persisted registered quantity after manual
adjustments.

Rules:

- Manual consumption or adjustment continues to happen against a specific lot.
- Manual removal persists by reducing that lot quantity.
- A lot participates in depletion forecasting only through its parent
  `ProductType`.
- Lots under a product type without an active depletion rule are ignored by
  `depletingItems`.

## Calculation

Use dynamic read-time calculation.

For each product type with an active durability rule:

```ts
recordedAvailableQuantity = sum(current lot.quantity for product type)
completedIntervals = floor(elapsed time from anchorDate / rule interval)
scheduledConsumedQuantity = completedIntervals * consumeAmount
estimatedCurrentQuantity = max(
  recordedAvailableQuantity - scheduledConsumedQuantity,
  0,
)
```

The calculation uses full intervals only.

Examples:

- Soap:
  - registered quantity: `5 lt`
  - rule: `1 lt every 1 month`
  - after three completed months:
  - `estimatedCurrentQuantity = 5 - 3 = 2 lt`
- Soap with manual gift:
  - registered quantity after manual removal: `4 lt`
  - rule: `1 lt every 1 month`
  - after three completed months:
  - `estimatedCurrentQuantity = 4 - 3 = 1 lt`
- Shampoo:
  - registered quantity: `6 lt`
  - rule: `0.5 lt every 2 months`
  - after four completed months:
  - `completedIntervals = 2`
  - `estimatedCurrentQuantity = 6 - 1 = 5 lt`

## Estimated Depletion Date

`estimatedDepletionAt` should be calculated from the current reference date
and the active rule.

Recommended first version:

- If `estimatedCurrentQuantity <= 0`, return the reference date.
- Otherwise, calculate how many full future intervals are needed until the
  scheduled consumed amount reaches the current recorded available quantity.
- Return the date at the end of that interval.

This value is an estimate for planning and should not delete or mutate lots.

## Pantry Overview

Extend the backend overview read model rather than making Angular rebuild the
calculation.

Each `PantryOverviewItem` should include:

- `totalQuantity`
- `estimatedCurrentQuantity`
- `estimatedConsumedQuantity`
- `estimatedDepletionAt`
- `hasDepletionRule`
- `depletionRule` or a display-safe summary of the active rule

Add a new overview group:

- `depletingItems`

`depletingItems` should include product types with:

- an active depletion rule
- `estimatedCurrentQuantity <= consumeAmount`

This threshold means a product appears when it has one consumption interval or
less estimated stock remaining.

## UX Design

The pantry view should keep expiration and durability visibly separate.

Recommended priority:

1. `Proximos a caducar`
2. `Se agotan pronto`
3. `Despensa por tipo base`

Product-type cards should show:

- `Registrado`
- `Estimado actual`
- `Durabilidad`
- `Agotamiento estimado`

Example:

```text
Jabon liquido
Registrado: 4 lt
Estimado actual: 1 lt
Durabilidad: 1 lt / mes
Agotamiento estimado: 24 Jul 2026
```

Lot rows should not display their own durability rule. They can show a short
indicator that the parent type has durability enabled.

Manual adjustment language should stay explicit:

- `Ajustar lote`
- `Consumir de este lote`
- `Quitar cantidad`

The UI should not imply that PantryList knows the exact physical amount unless
the user manually confirms it. Suggested copy:

- `Registrado` = persisted quantity after manual adjustments.
- `Estimado actual` = registered quantity minus scheduled durability usage.

## API Design

Do not add new endpoints in the first implementation.

Extend existing endpoints:

- `POST /api/product-types`
  - accepts optional `defaultDepletionRule`
- `GET /api/product-types`
  - returns the rule when present
- `GET /api/product-types/:id`
  - returns the rule when present
- `POST /api/inventory-lots`
  - unchanged for durability; lots do not define their own rule
- `POST /api/inventory-lots/:id/consume`
  - remains the manual adjustment path
- `GET /api/pantry/overview`
  - returns enriched depletion fields and `depletingItems`

## Error Handling

Backend should reject:

- enabled rules without `anchorDate`
- `consumeAmount <= 0`
- `everyAmount <= 0`
- unsupported `everyPeriod`
- depletion rule units that do not match `ProductType.defaultUnit`

Frontend should show:

- validation feedback when configuring durability
- clear empty state when no products are depleting soon
- separate durability and expiration labels

## Testing Strategy

Backend tests:

- Product type without durability does not appear in `depletingItems`.
- Soap `5 lt`, `1 lt / month`, after three months estimates `2 lt`.
- Soap after manual removal to `4 lt`, after three months estimates `1 lt`.
- Shampoo `6 lt`, `0.5 lt / 2 months`, after four months estimates `5 lt`.
- `depletingItems` includes only types with
  `estimatedCurrentQuantity <= consumeAmount`.
- Invalid depletion rules are rejected by domain or DTO validation.

Frontend tests:

- Product type form can enable and validate durability.
- Pantry overview renders `Registrado` and `Estimado actual`.
- `Se agotan pronto` appears separately from `Proximos a caducar`.
- Lot rows do not show per-lot durability configuration.
- Manual lot consumption still reduces registered quantity.

Manual smoke test:

- Create a product type with durability enabled.
- Add one or more lots under that type.
- Verify `estimatedCurrentQuantity` based on the anchor date.
- Manually consume or remove a quantity from one lot.
- Verify the estimate reflects both the persisted adjustment and the scheduled
  durability rule.
- Verify a type without durability does not appear in depletion alerts.

## AWS CDK And DynamoDB Foundation

The next cloud-oriented subproject should be a separate foundation spec and
implementation plan.

Recommended scope:

- Add an `infra/` workspace with AWS CDK.
- Document a future DynamoDB access model for PantryList.
- Evaluate a single-table design around:
  - `User`
  - `ProductType`
  - `InventoryLot`
  - `RefreshSession`
  - future household membership
- Use `userId` as the primary tenancy boundary.
- Keep MongoDB as the active runtime database during this feature.

This gives PantryList a real cloud architecture path without coupling the
durability implementation to a database migration.

## Rollout Order

1. Add depletion rule value object and validation.
2. Extend `ProductType` domain, schema, DTOs, mappers, and repository.
3. Add depletion calculation helpers for overview read models.
4. Extend `PantryOverview` and `depletingItems`.
5. Update Angular models, forms, and pantry rendering.
6. Add backend and frontend tests.
7. Run manual browser smoke testing.
8. Create the separate AWS CDK and DynamoDB foundation spec.

## Security And Data Integrity Notes

- Depletion estimates must never mutate inventory automatically.
- Manual adjustments must remain authenticated and scoped to the current user.
- The backend must keep calculating ownership from authenticated identity, not
  caller-supplied `userId`.
- The feature must not log private pantry contents beyond normal development
  diagnostics.
- A depletion estimate of zero must not delete lots or hide history.

## Possible Future Features

- AI-assisted durability suggestions by category and product name.
- Household-level shared depletion profiles.
- Notifications when a product is estimated to deplete soon.
- Shopping list generation from `depletingItems`.
- Consumption history and adjustment reason tracking.
- Cognito and Google login after local auth is fully stable.
- DynamoDB-backed pantry persistence after the CDK foundation is validated.

## Recommendation

Implement durability as a `ProductType` rule with dynamic read-time depletion
forecasting. Keep lots as the source for persisted registered quantities, and
keep manual adjustment by lot for real-world corrections.

This gives PantryList a clear planning feature without hidden background stock
mutations, while leaving a clean path toward AWS CDK and DynamoDB work in a
separate follow-up.
