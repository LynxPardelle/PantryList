# Use-First Waste Reduction

## Summary

- Added a "Usar primero" panel that combines expiring lots, leftovers, and estimated unit prices to show what should be consumed before buying more.
- Added a "Sobras preparadas" starter template with a short suggested expiration window.
- Expanded storage locations for common LatAm household contexts: leftovers, prepared meals, baby, office, car, and tools.
- Added monthly staple and waste summaries alongside the existing shopping and waste panels.
- Added a recent pantry timeline derived from purchase dates, waste events, and price history.

## Scope Notes

- No new backend storage, repository, or API contract was added.
- No OCR, receipt image, AI, retailer, payment, or household-collaboration behavior was added.
- The panel uses existing pantry overview, waste overview, and price reference data.
- "Usar primero" opens the relevant lot section instead of performing destructive consume/waste actions.

## Validation

- Frontend focused tests: `npm test -- --watch=false --browsers=ChromeHeadless --include src/app/features/pantry/pantry-page.component.spec.ts`
- Frontend full tests: `npm test -- --watch=false --browsers=ChromeHeadless`
- Frontend build: `npm run build`
- Backend lint: `npm run lint:check`
- Backend tests: `npm test`
- Backend build: `npm run build`
- Privacy review gate: `node tools\require-privacy-review.mjs --base=origin/main --head=HEAD --include-working-tree=true`
- Diff whitespace check: `git diff --check`
