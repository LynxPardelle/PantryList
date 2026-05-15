# Selected Feature Package

Date: 2026-05-15

Status: Recommended next package. This is a product/technical decision note, not an implementation spec.

## Package Name

**LatAm Shopping Value + Trust Foundation**

## Decision

Build the next package around a safer, Latin America-oriented shopping workflow:

1. Technical trust foundation.
2. Local units and shopping context.
3. Budgeted shopping mode.
4. WhatsApp-friendly shopping export.
5. Use-first / buy-soon dashboard.
6. Monetization readiness without real billing yet.

This package combines the strongest overlap across:

- competitor feature research,
- monetization research,
- technical risk research,
- current PantryList product shape.

## Why This Package

This is the smallest coherent package that can improve real user value while reducing release risk.

Competitor research points to shared lists, budget visibility, local shopping context, use-first expiration guidance, and fast list operations.

Monetization research points to a future freemium household plan where budget, sync, backup, reports, and advanced shopping workflows can become paid value.

Technical risk research says the app should not ship more user-facing workflows on top of known dependency, SSR, CI, rate-limit, header, and error-normalization gaps.

The selected package avoids high-complexity bets such as AI capture, real-time retailer price comparison, delivery integrations, full meal planning, and real billing.

## Included Features

### 1. Technical Trust Foundation

Source:

- `docs/research/features/2026-05-15-technical-risk-feature-ideas.md`

Scope:

- Upgrade vulnerable runtime dependencies, especially Angular SSR.
- Add CI security checks: runtime `npm audit`, secret scan, and container scan.
- Add API and SSR proxy rate limits.
- Add SSR/frontend security headers.
- Normalize domain errors so user mistakes return clean `400` responses instead of accidental `500` responses.

Why included:

- This reduces release risk before adding more workflows.
- It protects auth, shopping, and export endpoints from obvious abuse.
- It gives future monetization and household features a safer base.

### 2. Local Units And Package Types

Source:

- `docs/research/features/2026-05-15-latam-competitor-feature-ideas.md`

Scope:

- Add or normalize common Latin American units and package types:
  - pieza
  - paquete
  - lata
  - bolsa
  - botella
  - caja
  - docena
  - kg
  - g
  - L
  - ml
  - manojo
  - medio kilo
  - cuarto
  - rollo

Why included:

- It makes the app feel native to the target market.
- It supports both groceries and household products.
- It improves inventory and shopping list accuracy without requiring integrations.

### 3. Custom Storage And Shopping Locations

Source:

- competitor feature research: custom locations, pantry/fridge/freezer/cleaning sections, store-specific lists.

Scope:

- Let users define where an item lives:
  - despensa
  - refrigerador/nevera
  - congelador/freezer
  - baño
  - limpieza
  - botiquin
  - mascotas
  - bodega
- Let users define where they usually buy it:
  - supermercado
  - mercado
  - tiendita
  - abarrotes
  - mayoreo
  - farmacia
  - otro

Why included:

- Latin American shopping often happens across multiple store types.
- This supports future store-specific lists without needing retailer integrations.

### 4. Budgeted Shopping Mode

Source:

- competitor feature research: running totals, price history, price per item.
- monetization research: budget and savings pack as a strong premium candidate later.

Scope:

- Add last paid price or estimated price per product type.
- Show running estimated total in the shopping plan/list.
- Support notes such as:
  - preferred brand,
  - substitute brand,
  - buy only on promo,
  - preferred store.

Why included:

- It creates immediate household value.
- It supports the LatAm positioning around saving money and avoiding duplicates.
- It becomes a natural monetization bridge later through price history, reports, and savings summaries.

### 5. WhatsApp-Friendly Shopping Export

Source:

- competitor feature research: text sharing, share-by-link, household coordination.
- monetization research: basic WhatsApp/text export should stay free.

Scope:

- Generate a clean text shopping list grouped by location/category.
- Include item name, quantity, unit, note, and estimated price when present.
- Keep it copy/share friendly rather than building real-time collaboration first.

Why included:

- It fits Latin American household coordination.
- It delivers sharing value without immediately building account-level household collaboration.
- It is lower risk than shared inventory links.

### 6. Use-First / Buy-Soon Dashboard

Source:

- competitor feature research: expiration, waste, use-first guidance.
- current app model: expiration and depletion already exist.

Scope:

- Combine existing expiration and depletion signals into two clear action groups:
  - `Usar primero`
  - `Comprar pronto`
- Keep the logic deterministic.
- Do not add AI meal planning.

Why included:

- It reuses PantryList's strongest current logic.
- It turns inventory state into household action.
- It supports future waste/savings reporting.

### 7. Monetization Readiness Without Billing

Source:

- `docs/research/monetization/2026-05-15-monetization-ideas.md`

Scope:

- Define free vs future paid boundaries in code/docs, but do not implement payments yet.
- Keep free:
  - manual inventory,
  - basic expiration tracking,
  - basic shopping list,
  - basic depletion estimate,
  - basic WhatsApp/text export,
  - basic data export,
  - local Spanish/LatAm vocabulary.
- Mark future paid candidates:
  - household sync,
  - cloud backup,
  - price history analytics,
  - advanced reports,
  - advanced reminders,
  - AI/OCR receipt capture.

Why included:

- It prevents accidentally building monetizable features in a scattered way.
- It avoids real billing complexity before the value proposition is validated.

## Out Of Scope For This Package

- Real billing or payment provider integration.
- AI receipt scan, shelf scan, or barcode-only workflows.
- Full household sharing and live collaboration.
- Real-time supermarket price comparison.
- Rappi/Walmart/supermarket delivery integration.
- Full meal planning.
- Sponsored offers or ads.
- B2B inventory mode.
- Nutrition warning-label metadata.
- MFA and full device management, unless they are pulled into a separate auth hardening package.

## Recommended Implementation Order

### Phase 1: Trust Foundation

Implement first:

1. Upgrade vulnerable dependencies.
2. Add CI security checks.
3. Add rate limiting.
4. Add SSR/frontend security headers.
5. Normalize domain errors.

Success criteria:

- Runtime `npm audit --omit=dev` passes or has documented accepted exceptions.
- CI runs security checks.
- Mutating and auth endpoints return `429` under configured abuse thresholds.
- SSR and frontend responses include the intended security headers.
- Over-consuming a lot returns a clean `400`.

### Phase 2: LatAm Data Shape

Implement next:

1. Local units and package types.
2. Storage locations.
3. Usual shopping locations.
4. Product notes for brand, promo, and substitute.

Success criteria:

- Users can model common Latin American purchases without awkward unit workarounds.
- Existing inventory data remains compatible.
- Tests cover new enum/value handling and migration/default behavior.

### Phase 3: Shopping Workflow

Implement after the data shape:

1. Budgeted shopping mode.
2. WhatsApp-friendly export.
3. Use-first / buy-soon dashboard.

Success criteria:

- Shopping plan shows estimated total when prices exist.
- Exported text is readable in WhatsApp and includes quantities/notes.
- Dashboard action groups are deterministic and covered by tests.

### Phase 4: Monetization Discovery

Implement last in this package:

1. Document free/future paid boundaries.
2. Add non-blocking UI copy or internal flags only if needed.
3. Do not charge users yet.

Success criteria:

- The app can be dogfooded with the new workflow.
- Future Plus candidates are clear, but core free value is not degraded.

## Why Not Start With Household Sharing

Household sharing is important, but it raises security, privacy, sync, roles, link expiration, and session/device questions.

WhatsApp-friendly export gives useful coordination now without taking on full shared-account complexity.

## Why Not Start With AI Capture

AI capture is attractive, but it introduces variable cost, privacy concerns, data accuracy risks, and confirmation UX complexity.

Manual quick entry, local units, budget mode, and export are better first because they improve the core loop without depending on AI reliability.

## Why Not Start With Payments

The monetization research points to a household freemium plan, but billing should wait until the app proves repeat value through budgeted shopping and household workflows.

Implementing payments before validating the package would add tax, support, entitlement, refund, and compliance work too early.

## Recommended Next Step

Create an implementation spec for Phase 1 and Phase 2 together, then implement them as a bounded first milestone.

Phase 3 should follow only after the new data shape is stable.
