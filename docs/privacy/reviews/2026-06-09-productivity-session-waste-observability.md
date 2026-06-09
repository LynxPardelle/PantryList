# Privacy Review - Productivity, Session, Waste, Observability Batch

Date: 2026-06-09 CT

## Scope

- Profile now records a hashed per-user device identifier when `/profile` is loaded and shows recent known devices.
- Inventory lot consumption can be marked as waste with reason and optional note.
- Pantry exposes a 30-day waste overview for the household pantry owner scope.
- Metrics can optionally send alert snapshots to `METRICS_ALERT_WEBHOOK_URL`.
- Frontend supports local saved shopping-list snapshots and local voice-assisted quick capture.

## Data Added

- Known devices: hashed device id, user id, browser/platform summary, first seen, last seen, seen count.
- Waste events: user id, product type id, optional lot id, product name, quantity, unit, reason, optional note, estimated loss, occurred/created timestamps.
- Local browser data: saved shopping-list snapshots, quick-capture drafts, shopping trip drafts, pending checkouts, and client device id.
- Metrics alert payload: service name, generated time, alert codes, aggregate counts, and route-level aggregate metrics only.

## Controls

- Raw client device ids are not persisted server-side; the backend stores a SHA-256 hash scoped by user id.
- Device records are removed during account deletion.
- Waste events are removed during local pantry-data deletion and account deletion.
- Waste overview reads use household read authorization; waste mutation uses household write authorization through lot consumption.
- Metrics webhook is disabled unless `METRICS_ALERT_WEBHOOK_URL` is configured and sends aggregate route metrics without user identifiers or request bodies.
- Voice capture stays in browser textarea/draft flow; audio is not sent by PantryList. Browser speech recognition provider behavior depends on the user's browser.

## Residual Risks

- Waste notes are free text and may contain sensitive information if users type it; UI labels should keep notes optional and short.
- Known devices are "seen devices", not a complete revocable session list. Cognito global sign-out remains the revocation control.
- Local saved shopping lists are per-browser and not included in server export/delete operations.
- Metrics webhook URLs may include credentials in their URL; logs intentionally avoid printing the URL.
