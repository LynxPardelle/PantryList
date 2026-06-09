# Privacy Review: Use-First Waste Reduction

## Data Touched

- Existing pantry overview lots: product type, category, quantity, unit, purchase date, expiration date, expiration status, and storage metadata.
- Existing product-type shopping metadata: storage location and estimated unit price.
- Existing waste overview events: product name, quantity, unit, reason, estimated loss, and timestamp.
- Existing price reference history: estimated unit price, store, unit, and recorded timestamp.

## New Collection

- No new data category is collected.
- No new backend table, repository, API route, external partner integration, image capture, OCR, AI, payment, or retailer connection was added.
- The "Sobras preparadas" template writes the same lot and product-type fields already used by manual pantry registration.

## User Visibility And Control

- "Usar primero" is read-only guidance. It expands and scrolls to the related lot section; it does not consume, archive, delete, or mark waste automatically.
- Users still explicitly register lots, mark waste, set estimated prices, and manage product metadata through existing forms.
- The timeline is derived from existing visible pantry, waste, and price data.

## Retention

- This batch does not change retention behavior.
- Lot, waste, price, archive, export, and account deletion behavior remain governed by existing pantry/profile controls.

## Risk Notes

- Estimated loss is calculated from user-entered estimated unit prices and lot quantity, so it should remain labeled as estimated guidance.
- Leftover tracking can reveal eating habits if a device or account is shared. Keep household permissions and export/delete controls visible before adding richer meal planning or image capture.
