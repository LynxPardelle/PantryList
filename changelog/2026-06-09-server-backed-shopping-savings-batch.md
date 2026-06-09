# 2026-06-09 - Server-Backed Shopping Savings Batch

## Implemented

- Added server-backed saved shopping lists with MongoDB and DynamoDB repositories.
- Added authenticated `/pantry/shopping-lists` list/create/delete endpoints.
- Scoped saved lists through existing household read/write access.
- Included saved shopping lists in pantry export and pantry/account deletion.
- Added frontend saved-list sync with explicit local fallback if the API is unavailable.
- Added duplicate-purchase warning count to pantry value insights.
- Added weekly estimated waste-loss display from the existing waste overview.
- Added disabled Plus preview for monetization discovery without billing.
- Added privacy review and privacy gate pattern for saved shopping lists.

## Validation

- Backend focused Jest: passed.
- Frontend build: passed.
- Frontend focused Karma specs: passed.

## Deferred

- True Cognito per-device active-session inventory and single-device revocation.
- Real billing, subscriptions, Stripe/Mercado Pago, or payment collection.
- Transactional unit-of-work for waste event save plus lot consumption.
