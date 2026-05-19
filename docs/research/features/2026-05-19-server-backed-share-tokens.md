# Server-Backed Share Tokens Batch

Date: 2026-05-19

Status: Implemented and locally verified; pending production rollout.

## Implemented

- Replaced client-encoded shopping-list links with opaque server-backed tokens.
- Added authenticated owner endpoints:
  - `POST /api/pantry/shopping-shares`
  - `DELETE /api/pantry/shopping-shares/:token`
- Added public view-only endpoint:
  - `GET /api/shopping-shares/:token`
- Added seven-day default expiry.
- Added owner-only revocation.
- Stored only SHA-256 token hashes, never raw share tokens.
- Kept public responses to list text plus created/expires dates.
- Kept legacy client-encoded link fallback so old temporary links can still render until they expire.
- Deleted share records as part of `DELETE /api/profile/pantry-data`.
- Added a privacy checklist for sharing, AI/OCR, payments, and exports.

## Production-Safety Notes

- DynamoDB implementation stores share records in the existing users table with `SHOPPING_SHARE#<tokenHash>` keys. This avoids a new production table/env-var dependency for this batch.
- Public share resolution is unauthenticated and returns no account/profile fields.
- Mutating create/revoke endpoints stay behind the existing access-token guard and XSRF check.
- Request logs include request id, user id, and text length only. They do not log item names, notes, raw tokens, or list text.

## Not Included Yet

- Full household workspace roles.
- Invitations.
- Multiuser read/write policy.
- Active share management list.
- Shared-list change notifications.
- Automatic expired-share cleanup in DynamoDB.

## Verification

- Backend focused share-token tests:
  - `npm test -- src/application/use-cases/shopping-share.use-cases.spec.ts`
  - Result: 5 passed.
- Backend full tests:
  - `npm test`
  - Result: 140 passed.
- Backend build:
  - `npm run build`
  - Result: success.
- Backend lint:
  - `npm run lint:check`
  - Result: success.
- Frontend full tests:
  - `npm test`
  - Result: 84 success.
- Frontend build:
  - `npm run build`
  - Result: success.
- Repository whitespace check:
  - `git diff --check`
  - Result: success.

## Updated Backlog After This Batch

### Collaboration

- Full shared household workspace with invite, member role, ownership transfer, and removal flow.
- Household read/write policy for pantry items, lots, shopping plan, and profile preferences.
- Change notifications for shared shopping lists.
- Active share management list with revoke buttons for older links not visible on the current page.

### Trust And Data Lifecycle

- Account deletion that includes Cognito identity handling, not only PantryList inventory deletion.
- Retention policy for archived/deleted records.
- Automatic expired-share cleanup in production persistence.
- CI security scanning lane: CodeQL, secrets, runtime audit, and image scan.

### Product

- Store-route category ordering for supermercado, mercado, tiendita, mayoreo, farmacia, limpieza, and custom routes.
- Multiple shopping lists by store, occasion, or trip.
- Common staple templates by household type.
- Voice input for quick capture.
- Receipt scan as a later AI/premium feature with explicit privacy review.
