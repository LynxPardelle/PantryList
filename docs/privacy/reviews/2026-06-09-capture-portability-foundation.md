# Privacy Review: Capture And Portability Foundation

## Data Touched

- Existing pantry overview data exported into CSV: product name, variant, category, quantity, unit, storage location, shopping location, preferred brand, estimated price, purchase date, and expiration date.
- User-provided quick-capture text and imported CSV rows.
- User-selected local image files for preview and optional local barcode detection.
- User-confirmed barcode values when added to quick-capture drafts.

## New Collection

- No new backend data category is collected.
- No image, receipt, barcode, or CSV upload was added.
- No AI/OCR provider, retailer API, payment provider, or product catalog lookup was added.
- Confirmed barcodes can be saved in local quick-capture drafts and can populate editable shopping notes when the user chooses to use that draft item.

## User Visibility And Control

- Imported CSV rows populate editable quick-capture text before saving.
- Barcode detection never registers a lot directly; the user must click to add the detected code to the draft and then choose whether to use the draft item.
- Product photos are previewed locally in the browser and are not persisted by this batch.
- CSV export is user-triggered and downloads to the current browser.

## Retention

- CSV downloads are retained wherever the user's browser or operating system saves them.
- Quick-capture drafts remain in browser localStorage until cleared or overwritten by app behavior.
- Photo preview object URLs are revoked when replaced or when the component is destroyed.
- Backend retention, account deletion, and export behavior are unchanged.

## Risk Notes

- CSV exports can contain household inventory, purchase timing, and estimated price data. Keep export user-triggered and do not auto-share.
- Barcode values can reveal product identity. Keep them editable and user-confirmed until a real product catalog/privacy design exists.
- Future receipt OCR, shelf photos, or AI capture must get a separate privacy review before any remote processing or persistent image storage.
