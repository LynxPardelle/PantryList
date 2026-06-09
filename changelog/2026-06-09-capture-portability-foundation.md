# Capture And Portability Foundation

## Summary

- Added quick-capture preview for pasted multi-line shopping text before saving local drafts.
- Added CSV import into editable quick-capture text, including regional semicolon-delimited files.
- Added active pantry CSV export for Excel review.
- Added local product-photo preview with best-effort browser barcode detection when supported.
- Added manual barcode confirmation into quick-capture drafts.
- Added an AI capture credits Plus preview without billing, payment, OCR, or remote processing.

## Scope Notes

- No new backend storage, repository, or API contract was added.
- No image, receipt, barcode, or CSV file is uploaded by this batch.
- Photo preview uses local browser object URLs and is cleared when the component is destroyed.
- Barcode detection is local and best effort. Users must confirm before a detected or typed code is added to the draft.
- Confirmed barcodes are treated as editable capture notes, not as trusted product catalog data.
- AI/OCR, retailer integrations, payments, product catalog enrichment, and live camera scanning remain deferred.

## Validation

- Frontend focused tests: `npm test -- --watch=false --browsers=ChromeHeadless --include src/app/features/pantry/pantry-page.component.spec.ts` -> `52 SUCCESS`.
- Frontend full tests: `npm test -- --watch=false --browsers=ChromeHeadless` -> `115 SUCCESS`.
- Frontend build: `npm run build` -> passed.
- Backend lint: `npm run lint:check` -> passed.
- Backend tests: `npm test` -> `51 passed, 198 passed`.
- Backend build: `npm run build` -> passed.
- Privacy review gate: `node tools\require-privacy-review.mjs --base=origin/main --head=HEAD --include-working-tree=true` -> `Privacy review gate: no sensitive feature files changed.`
- Whitespace audit: `git diff --check` -> passed.
