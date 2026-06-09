# Privacy Review: Shopping Mode 2.0 LatAm

## Data Touched

- Server-backed saved shopping lists already associated with the authenticated pantry owner or household.
- Browser localStorage fallback for saved shopping lists and shopping trip drafts.
- Product-type shopping metadata: shopping location, notes, preferred brand, estimated/latest paid price, and household basic flag.
- Checkout payloads used to create inventory lots from selected shopping-mode items.

## New Collection

- No new data category is collected.
- No new backend table, repository, or external partner integration was added.
- "Notas / pasillo" uses the existing `shoppingNotes` field.

## User Visibility And Control

- Users explicitly click "Guardar maestra" to create a reusable master list.
- Users explicitly click "Repetir" or "Repetir maestra" before a saved list populates shopping mode.
- Users can uncheck items, change quantity, change paid price, or change store before closing a purchase.
- Existing saved-list delete behavior remains available.

## Retention

- Server-backed saved lists follow the existing saved shopping list retention/export/delete behavior.
- Local fallback lists and shopping trip drafts remain browser-local and can persist until deleted by browser storage controls or overwritten by app behavior.

## Risk Notes

- Repeating a saved list can create new lots even when a product is not currently missing. This is intentional for recurring LatAm shopping trips but should stay visibly user-controlled.
- Paid price remains household inventory metadata, not payment data. Do not add card, receipt image, or billing data without a separate privacy review.
