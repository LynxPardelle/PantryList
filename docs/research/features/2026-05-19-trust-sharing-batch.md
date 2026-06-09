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
- Follow-up implemented on 2026-06-08 CT: active temporary-share management now lists active links, revokes by internal share id without exposing raw tokens in the UI state, shows created/expires timestamps in Central time, logs safe share operations with request ids, and writes DynamoDB TTL metadata through `expiresAtEpochSeconds`.
- Follow-up implemented on 2026-06-08 CT: initial household workspace foundation now creates a default household, stores owner/editor/viewer memberships, creates email-scoped invite tokens, accepts/revokes invites, removes non-owner members, and exposes a profile UI panel.
- Follow-up implemented on 2026-06-08 CT: household pantry authorization now applies owner-backed read/write policy to product types, inventory lots, legacy products, pantry overview, archived data, export, checkout, shopping-share controls, and pantry deletion. Household owners/editors can mutate shared pantry data, viewers can read pantry data, and destructive full pantry deletion is owner-only.
- Follow-up implemented on 2026-06-08 CT: household activity notifications now show recent household and temporary shopping-share mutations in the profile collaboration panel.
- Follow-up implemented on 2026-06-08 CT: account deletion now includes Cognito identity deletion, local pantry data deletion, local user deletion, session cookie clearing, and owner-household guardrails.
- Follow-up implemented on 2026-06-08 CT: DynamoDB household and shopping-share lookup paths now write generic GSI keys and use indexed query access patterns with temporary legacy fallbacks for pre-index records.
- Follow-up implemented on 2026-06-09 CT: security lifecycle controls now expose retention policy in profile, support optional archived-record TTL metadata with auto-delete off by default, require privacy review docs for sensitive feature diffs in CI, add Cognito global sign-out from profile, add optional step-up checks for destructive profile actions, and support optional software-token MFA through CDK context.
- Follow-up implemented on 2026-06-09 CT: LatAm shopping route groups now sort by fixed store route, the pantry form offers starter staple templates, and product-type shopping metadata includes a "replenish when low" flag so one-off products do not become missing/restock candidates after they run out.
- Follow-up implemented on 2026-06-09 CT: technical observability and archive scale controls now add a protected `/api/metrics` snapshot, cursor pagination for archived pantry reads, frontend "Cargar más archivados", archived page-size metadata in export/profile limits, digest-pinned Node Docker base images, and a weekly base-image digest drift workflow.

## Security Notes

- Initial temporary shopping links did not grant account access but carried the generated shopping-list text.
- This risk was superseded by `docs/research/features/2026-05-19-server-backed-share-tokens.md`, which moved current links to server-backed opaque tokens with owner revocation.
- The UI now tells users that links can be revoked and should not include sensitive notes.

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

- Multiple shopping lists by store, occasion, or trip.
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

- Full session/device list beyond Cognito global sign-out.
- External metrics and alerting sink beyond the protected in-memory metrics snapshot.
- Cursor pagination for active pantry and legacy product reads beyond archived pantry pagination, current explicit query limits, and export metadata.
- Future backend architecture migration from the Nest monolith to AWS serverless microservices with Lambda, Step Functions where needed, supporting AWS services, and isolated dev/test/production environments.

## Recommended Next Batch

1. Full session/device list beyond Cognito global sign-out.
2. Multiple shopping lists by store, occasion, or trip.
3. Voice input for quick capture.
4. Cursor pagination for active pantry and legacy product reads if production data volume starts stressing overview/export paths.
5. Waste event tracking and weekly savings/waste summaries.

This is the best next package because the trust controls and first technical scale guardrails are now in place, so the next gain should improve user workflows while keeping a small technical safety follow-up ready.
