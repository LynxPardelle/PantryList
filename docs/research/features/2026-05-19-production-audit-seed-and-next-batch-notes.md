# Production Audit Seed And Next Batch Notes

Date: 2026-05-19

Status: Production audit notes and next-batch input.

## Audit Seed Data

Production account tested: `lnxdrk@gmail.com`.

Seed prefix: `AUDIT-20260519`.

Seeded product types:

1. `AUDIT-20260519 Arroz integral`
   - Category: food.
   - Unit: kg.
   - Coverage: pantry staple, Mercado route, estimated price, substitute brand, weekly depletion.
2. `AUDIT-20260519 Leche deslactosada`
   - Category: food.
   - Unit: lt.
   - Coverage: refrigerated staple, near expiration, Supermercado route, estimated price.
3. `AUDIT-20260519 Detergente ropa`
   - Category: cleaning.
   - Unit: botella.
   - Coverage: cleaning staple, Mayoreo route, promo-only flag, low stock.
4. `AUDIT-20260519 Shampoo familiar`
   - Category: hygiene.
   - Unit: botella.
   - Coverage: hygiene route, preferred/substitute brand, paid price history.
5. `AUDIT-20260519 Atun lata`
   - Category: food.
   - Unit: lata.
   - Coverage: missing-price path at first, later paid-price history, Tiendita/Mercado route behavior.

Final production state after shopping-mode close:

- Product types: 5.
- Inventory lots: 10.
- Shopping plan: 5 calculated recommendations.
- Near-expiration coverage: 1 type.
- Low-stock/depletion coverage: 1 type after replenishment.
- Price history coverage: 5 products with reference history.
- Local quick-capture draft: 2 products.

## Flows Verified

- New product type plus lot registration created all five audit product types.
- Pantry overview updated with counts, expiration, depletion, staples, route groups, budget status, and price references.
- Shopping budget accepted `180` and showed over/under-budget copy.
- Copy shopping list generated WhatsApp-ready text and exposed an `https://wa.me/` handoff link.
- Shopping mode initially rejected close when no items were selected.
- Selecting five items and closing the trip registered five audit purchase lots.
- Quick capture saved a local draft after real typing into the textarea.
- Profile data export completed with `Export listo`.
- Destructive pantry-data deletion was not submitted.
- Browser console audit for the tested flows returned no `error` or `warn` entries.

## Next Batch Input

Include a small production-audit hardening lane in the next feature batch:

- Keep destructive actions visually disabled until their exact confirmation state is valid.
- Apply the same pattern to future export/delete/share/account actions that have irreversible or privacy-sensitive effects.
- Avoid relying only on submit-handler rejection for dangerous actions.

This captures the profile delete-button improvement as part of the next-batch quality bar, even though the immediate profile guard fix has already been implemented.

## Follow-Up Findings

1. Pantry route navigation briefly rendered the empty pantry state before authenticated data finished loading. The seeded data appeared correctly after waiting. Candidate improvement: preserve a loading/skeleton state until auth and overview calls settle.
2. Browser automation `fill()` did not reliably update the quick-capture textarea or clear the profile confirmation input, while real typing did. Treat this as a manual-audit caveat unless a user reproduces it directly.
3. After destructive confirmation tests, return the browser to `/pantry` so a dangerous form is not left armed in the profile view.
