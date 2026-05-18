# 2026-05-18 - Privacy, query limits, observability, shopping mode

## Goal

Build the next approved PantryList package without changing the core product model:

1. Privacy controls and data lifecycle.
2. Pagination/query limits guardrails.
3. Observability baseline for sensitive shopping operations.
4. Shopping mode plus close-purchase flow.
5. Offline-capable shopping draft behavior.
6. Household sharing lite through OS share, WhatsApp, and manual copy.

## Constraints

- Keep changes surgical and compatible with the existing `ProductType` plus `InventoryLot` model.
- Preserve LatAm shopping workflows: tiendas, mercados, presupuesto, WhatsApp.
- Do not introduce public pantry-sharing links in this batch; household sharing lite must not expose inventory state through unauthenticated URLs.
- Any server mutation must remain authenticated and XSRF protected.
- Client-side offline data is convenience-only; server remains source of truth.

## Backend Design

### Query Limits

- Define shared query limits in the application layer.
- Apply repository-level limits to user-owned product type and inventory-lot list queries.
- Limit product-type search results.
- Keep `findById` unchanged.

### Close Purchase

Add `POST /api/pantry/checkout`.

Request:

```json
{
  "items": [
    {
      "productTypeId": "uuid",
      "quantity": 2,
      "unit": "kg",
      "paidUnitPrice": 35.5,
      "shoppingLocation": "Mercado",
      "variantName": "Bolsa",
      "expiresAt": "2026-06-01"
    }
  ]
}
```

Behavior:

- Verify every product type belongs to the current user.
- Verify each lot unit matches the product type default unit.
- Create inventory lots with `purchaseDate = now`.
- If paid price or store is present, update `shoppingMetadata` and record price history through the existing entity behavior.
- Return created inventory lots.

### Observability

- Log checkout attempts with safe aggregate fields only: item count and user id.
- Never log product names, notes, prices, tokens, or request bodies.
- Existing request-id middleware remains the correlation mechanism.

## Frontend Design

### Privacy

- Add a "Datos y privacidad" panel in the pantry page.
- Let the user download the existing authenticated pantry export as JSON.
- Show explicit status and keep the export local to the browser.

### Shopping Mode

- Add a shopping mode panel on suggested purchases.
- Let users mark items as bought, adjust quantity, capture paid unit price, and store.
- Closing the purchase creates inventory lots and updates price references.
- Show planned vs actual total before submit.

### Offline Drafts

- Persist shopping-trip draft locally.
- If the user is offline, keep the draft and block server checkout with a clear status.
- Restore the draft when the page reloads.

### Sharing Lite

- Prefer `navigator.share` for household sharing where supported.
- Fallback to clipboard, WhatsApp link, and manual text area.
- Share text only, not an unauthenticated pantry state URL.

## Success Criteria

- Backend unit tests cover checkout creation and paid-price metadata updates.
- Frontend service tests cover checkout API call normalization.
- Frontend component tests cover export download and shopping-mode draft behavior where practical.
- `npm run test -- --runInBand` passes in backend.
- Frontend tests/build are run or failures are reported exactly.
