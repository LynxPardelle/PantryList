# Shopping Mode 2.0 LatAm

## Summary

- Added a "Lista maestra" action using the existing server-backed saved shopping list flow.
- Added repeat-shopping-list behavior so saved lists can populate shopping mode even when current restock recommendations are empty.
- Added shopping-mode bulk actions: mark all, mark urgent only, and clear all.
- Added a quick household-basic toggle from shopping plan and shopping mode rows.
- Added latest paid price visibility in shopping plan and shopping mode rows.
- Relabeled shopping notes as "Notas / pasillo" to support lightweight store-route context without adding a new aisle taxonomy table.

## Scope Notes

- No new backend storage or API contract was added.
- The feature reuses saved shopping lists, product-type shopping metadata, and close-purchase checkout.
- Repeated saved lists can close purchases into lots for product types that are not currently missing.
- Retailer integrations, structured aisle catalogs, payments, and AI capture remain deferred.

## Validation

- Frontend focused tests: `npm test -- --watch=false --browsers=ChromeHeadless --include src/app/features/pantry/pantry-page.component.spec.ts`
- Frontend build: `npm run build`
