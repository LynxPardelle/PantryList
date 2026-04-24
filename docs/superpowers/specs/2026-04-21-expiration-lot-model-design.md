# PantryList Expiration Lots Design

Date: 2026-04-21
Status: Approved in chat and used as the implementation baseline

## Context

This design was created from:

- The current PantryList codebase in:
  - `backend/src/domain/entities/product.entity.ts`
  - `backend/src/infrastructure/database/mongodb/schemas/product.schema.ts`
  - `backend/src/infrastructure/http/controllers/products.controller.ts`
  - `frontend/src/app/features/pantry/pantry-page.component.ts`
  - `frontend/src/app/features/pantry/pantry-page.component.html`
- The current project brief in `README.md`
- The user conversation on 2026-04-21 in which the desired behavior was clarified

## Problem

The current PantryList MVP stores inventory as one flat product record with one
quantity and one derived purchase date. That is not sufficient for real home
inventory management when the same type of item can exist in multiple purchases
with different expiration dates.

Examples requested by the user:

- `Atun` can exist as multiple lots such as 5 units expiring in 5 days and 2
  units expiring in 2 days.
- `Manzana` can exist as multiple groups such as 10 units expiring in one week
  and 5 units expiring in 3 days.
- `Jamon de pierna de pavo` should be a distinct base type from other jamon
  types, while still allowing different brands or presentations inside that
  same base type.

The user also required that inventory consumption must not automatically choose
the soonest-expiring lot. The system must ask which lot to consume from so the
household builds the habit of checking expiration dates intentionally.

## Goals

- Support a scalable model that separates base product types from inventory lots
- Track multiple lots per base type with independent expiration dates
- Group inventory by base type while preserving lot-level detail
- Highlight which lots are closest to expiration and how much quantity is at
  risk
- Require explicit user choice of lot when consuming inventory
- Suggest existing base types through simple non-AI matching, while still
  forcing the user to choose between an existing type and a new type
- Preserve existing PantryList data without inventing historical expiration
  detail

## Non-Goals

- No AI-based type suggestions in this phase
- No automatic meal planning in this phase
- No automatic FEFO consumption in this phase
- No barcode workflows in this phase
- No advanced household sharing or permissions in this phase

## Proposed Domain Model

### 1. ProductType

Represents the household-level base type that matters for planning and
replenishment.

Examples:

- `Atun`
- `Shampoo anticaspa`
- `Jamon de pierna de pavo`

Suggested fields:

- `id`
- `userId`
- `baseName`
- `category`
- `defaultUnit`
- `createdAt`
- `updatedAt`

Rules:

- `baseName` is user-defined and intentionally flexible
- different brands can belong to the same `ProductType`
- different subtypes that the user wants to manage separately must become
  different `ProductType` records
- `defaultUnit` becomes the canonical unit for that base type in the first
  version

### 2. InventoryLot

Represents a real purchase or homogeneous batch tied to one `ProductType`.

Examples:

- `Atun` + variant `Dolores en agua` + `5 piezas` + expires on `2026-04-26`
- `Atun` + variant `Herdez` + `3 piezas` + expires on `2026-04-23`

Suggested fields:

- `id`
- `userId`
- `productTypeId`
- `variantName` optional
- `quantity`
- `unit`
- `expiresAt` optional
- `purchaseDate` optional
- `createdAt`
- `updatedAt`

Rules:

- one lot groups only inventory that shares the same type, optional variant,
  unit, and expiration date
- `expiresAt` is optional because not every product category will use
  expiration tracking immediately
- the real pantry inventory lives in lots, not in aggregated product records
- in the first version, lot `unit` must match the parent `ProductType`
  `defaultUnit`; cross-unit conversion is out of scope

### 3. Pantry Overview Read Model

The frontend should consume an aggregated overview instead of rebuilding all
grouping logic itself.

Each grouped item should include:

- `productTypeId`
- `baseName`
- `category`
- `defaultUnit`
- `totalQuantity`
- `lotCount`
- `nextExpirationAt` optional
- `expiringSoonQuantity`
- `variants`
- `lots`

Each nested lot should include:

- `lotId`
- `variantName`
- `quantity`
- `unit`
- `expiresAt`
- `expirationStatus`
- `updatedAt`

## Expiration Rules

Initial expiration windows:

- `critical`: expires in 3 days or less
- `soon`: expires in 7 days or less
- `stable`: expires in more than 7 days
- `none`: no expiration date

Notes:

- The implementation should keep these thresholds in one place so they can be
  changed later without rewriting several components.
- The user-facing priority is visibility, not automation.

## Inventory Consumption Rules

- Consumption must always happen against a specific lot
- The system must not auto-pick the earliest expiration lot
- The user must choose the lot explicitly before discounting quantity
- Consumption should validate that the requested quantity does not exceed the
  lot quantity
- If a lot reaches zero quantity, it may either be deleted or retained with
  zero quantity; the implementation should prefer the simpler option unless the
  UI or history requirement forces retention

Recommended first implementation:

- delete empty lots after successful consumption
- keep the event simple instead of introducing movement history immediately

## UX Design

### Register Inventory

Replace the current "create product" flow with a "register lot" flow.

Required first decision:

- use existing product type
- create new product type

Behavior:

- The UI must always force the user to make that choice
- The UI may show simple text-based suggestions from existing product types
- Suggestions must not create or choose a type automatically
- In the first version, simple suggestions should come from normalized text
  matching only, such as exact match, prefix match, or contains match

Required lot fields for the first version:

- product type choice
- variant name optional
- quantity
- unit
- category when creating a new type
- expiration date optional
- purchase date optional

### Pantry Main View

The pantry screen should evolve into two primary zones:

1. `Expiring soon`
- most visible panel near the top
- grouped by base type
- shows quantity at risk, involved lots, and nearest expiration date

2. `Grouped pantry`
- one card per base type
- shows total quantity, lot count, nearest expiration, and known variants
- can expand to show lots inside that type

Each lot row should show:

- variant name or fallback label
- quantity and unit
- expiration date if present
- expiration status badge
- consume action

### Consumption Flow

Replace direct aggregate quantity buttons such as `+1` and `-1` with a guided
consume flow.

Recommended first flow:

- user opens a base type
- user clicks `Consumir`
- UI shows available lots for that type
- user selects a lot explicitly
- user enters quantity to consume
- UI confirms the updated grouped result

## API Design

Recommended resources:

### Product types

- `POST /product-types`
- `GET /product-types?userId=...&search=...`
- `GET /product-types/:id`

### Inventory lots

- `POST /inventory-lots`
- `GET /inventory-lots?userId=...`
- `GET /inventory-lots/expiring?userId=...&days=7`
- `POST /inventory-lots/:id/consume`

### Aggregated pantry views

- `GET /pantry/overview?userId=...`

`GET /pantry/overview` should return grouped pantry data ready for Angular to
render without rebuilding domain grouping rules on the client.

## Backend Architecture

Recommended additions:

- new domain entities:
  - `ProductType`
  - `InventoryLot`
- new repositories:
  - `ProductTypeRepository`
  - `InventoryLotRepository`
- new use cases:
  - create product type
  - search product types
  - create inventory lot
  - consume inventory lot
  - get pantry overview
  - get expiring lots
- new Mongo collections:
  - `product_types`
  - `inventory_lots`

The current flat product model should not remain the long-term source of truth
for inventory once the new model is in place.

## Frontend Architecture

Recommended frontend changes:

- replace flat `Product`-only assumptions in shared models and NgRx state
- add models for:
  - `ProductType`
  - `InventoryLot`
  - `PantryOverview`
  - `ExpiringGroup`
- replace the current create form with a lot registration flow
- replace flat product cards with grouped pantry cards and nested lots
- add a focused panel for expiring inventory
- add a consume-by-lot interaction instead of direct aggregate quantity edits

The frontend should prefer server-provided grouped data for overview rendering.

## Migration Strategy

Existing MVP data should be preserved conservatively.

Migration rules:

- for each current flat product record, create one `ProductType`
- for each current flat product record, create one initial `InventoryLot`
- set `expiresAt = null` for migrated lots because the current system does not
  contain historical lot expiration detail
- preserve `userId`, category, quantity, unit, and timestamps where possible

Important limitation:

- The current data model does not contain the lot-level expiration history
  needed to reconstruct past lots accurately. The migration must not invent
  that information.

## Error Handling

Backend should reject:

- invalid or missing `productTypeId`
- negative or zero lot quantities
- invalid consume amounts
- consume amounts larger than available lot quantity
- mismatched units where the API contract forbids them

Frontend should show:

- clear validation messages on lot creation
- explicit error feedback when a lot cannot be consumed
- visible empty states when no expiring lots exist

## Testing Strategy

### Backend

- entity tests for expiration classification
- entity and use-case tests for consumption validation
- repository tests for persisting product types and lots
- overview tests for correct grouping and expiring quantity aggregation
- e2e tests for:
  - creating product types
  - creating lots
  - listing pantry overview
  - listing expiring lots
  - consuming a lot

### Frontend

- selector tests for grouped pantry and expiring summaries
- component tests for:
  - lot registration form
  - expiring panel
  - grouped pantry cards
  - consume-by-lot flow

### Manual smoke test

- create one product type
- add several lots with different expiration dates
- verify grouping by base type
- verify expiring panel ordering
- consume from a chosen lot
- verify quantities and expiring status update correctly

## Security And Data Integrity Notes

- The new endpoints must continue using the authenticated or selected `userId`
  boundary consistently
- Input validation should stay at DTO level and also be defended in domain
  logic where important
- Do not infer or auto-select a lot during consumption because that can create
  incorrect household inventory tracking
- Simple text suggestions for product types should remain deterministic in this
  phase and must not depend on remote AI services

## Possible Future Features

- AI-assisted product type suggestions when creating lots
- meal planning based on soon-to-expire food
- household usage recommendations based on cleaning or hygiene expiration
- purchase prediction and restock planning by product type
- barcode scanning for faster lot registration
- consumption history and audit trail
- proactive notifications for expiring inventory
- shopping list generation from pantry shortages and expiration pressure

## Recommendation

Implement PantryList around:

- `ProductType` as the scalable household catalog
- `InventoryLot` as the real inventory source of truth
- `PantryOverview` as the aggregated read model for the frontend
- explicit consume-by-lot flows instead of automatic lot selection

This design aligns with the user-approved direction from the 2026-04-21 chat
and is intended to scale better than extending the current flat product model.
