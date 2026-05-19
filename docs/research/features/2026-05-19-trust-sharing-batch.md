# Trust And Sharing Batch

Date: 2026-05-19

Status: Implemented batch evidence and remaining backlog source.

## Implemented In This Batch

- Added an initial pantry loading shell so `/pantry` does not briefly present empty-state copy before the first overview response settles.
- Added a legacy copy fallback for shopping exports when the Clipboard API is blocked or rejects the write.
- Added a public, view-only temporary shopping-list route at `/shared-shopping-list?token=...`.
- Added profile privacy/data-lifecycle copy, including Cognito identity separation and current data limits.
- Added export metadata for active/archive/search/checkout query limits.
- Added request-id logs for pantry overview and export reads.

## Security Notes

- Temporary shopping links do not grant account access and only carry the generated shopping-list text.
- The current temporary link is client-side encoded, not server-side revocable. Anyone with the link can decode or retain the list text. A server-backed, revocable share-token model remains the right next step before calling this full household sharing.
- The UI now tells users that the link contains list text and should not include sensitive notes.

## Verification

- `frontend`: `npm test -- --include src/app/features/pantry/pantry-page.component.spec.ts --include src/app/features/profile/profile-page.component.spec.ts --include src/app/features/shared-shopping-list/shared-shopping-list-page.component.spec.ts`
  - Result: Angular/Karma ran the available suite and returned `81 SUCCESS`.
- `frontend`: `npm run build`
  - Result: success. No component CSS budget warning after reusing existing styles.
- `backend`: `npm test -- pantry.controller.spec.ts --runInBand`
  - Result: `4 passed`.
- `backend`: `npm run build`
  - Result: success.
- `backend`: `npm run lint:check`
  - Result: success.
- `repo`: `git diff --check`
  - Result: success.

## Remaining Backlog After Completed Items

### Competitor And LatAm Product Backlog

- Full shared household workspace with roles, invites, revocation, and change notifications.
- Store-route category ordering for supermercado, mercado, tiendita, mayoreo, farmacia, limpieza, and custom routes.
- Multiple shopping lists by store, occasion, or trip.
- Common staple templates by household type.
- Voice input for quick capture.
- Optional barcode scan with manual confirmation.
- Receipt scan as a later AI/premium feature with explicit privacy review.
- Shelf photo scan as a future experiment, treated as suggestions only.
- Waste event tracking: consumed, thrown away, donated, given away.
- Weekly waste and savings summaries.
- Suggested actions for expiring/low items: use, freeze, pause buying, donate, buy replacement.
- Broader household areas: botiquin, mascotas, bebe, bodega, and custom sections.
- Latin American warning-label metadata as optional user-entered fields.
- Leftovers/prepared food lots.
- Retailer handoff/deep links to delivery or supermarket apps after market focus is clear.

### Monetization Backlog

- Discovery spec for a simple household subscription.
- Fake paywall or upgrade preview to test whether users understand the Plus value before billing.
- Billing-path decision: Google Play billing for Android-first or web billing for PWA-first.
- Cloud sync and automatic backup as premium value.
- Full household collaboration as premium, while keeping basic export/temp sharing free enough to prove value.
- CSV/Excel export, CSV import, scheduled backup, and restore/version history.
- Budget and savings analytics beyond basic totals: monthly staples budget, duplicate warnings, reports.
- AI/OCR credits for receipt or shelf scanning once cost is bounded.
- Retailer handoff/affiliate model later, with labeled incentives only.
- Opt-in sponsored offers later, based on list category rather than raw inventory profiling.
- B2B Pantry for small offices, rentals, clinics, daycares, and community kitchens as a later branch.

### Technical And Security Backlog

- Server-backed, expiring, revocable share tokens.
- Account deletion that includes Cognito identity handling, not only PantryList inventory deletion.
- Retention policy for archived/deleted records.
- Privacy review checklist for AI, receipt, sharing, and payment features.
- CodeQL, secret scanning, runtime `npm audit`, and container scanning in CI.
- Non-mutating lint in CI.
- Docker image scanning and optional digest pinning.
- GitHub Actions Node runtime migration before Node 20 action support is removed.
- Production CloudFront origin guardrails: explicit HTTPS-only origin policy and origin exposure validation.

## Recommended Next Batch

1. Server-backed revocable shopping share tokens.
2. Full household workspace foundation: invite, role model, membership table, and read/write policy.
3. Change notifications for shared shopping lists.
4. Privacy review checklist wired into docs and PR review for sharing/AI/payment changes.
5. CI security scanning lane: CodeQL, secrets, runtime audit, and image scan.

This is the best next package because it upgrades the current client-only sharing into a real trust boundary before more collaboration or monetization work depends on it.
