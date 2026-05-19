# Privacy Review Checklist

Date: 2026-05-19

Status: Active checklist for sharing, AI, receipt, payment, and export changes.

Use this before shipping any feature that exposes pantry data outside the signed-in user boundary.

## Required Questions

- What user data leaves the private account boundary?
- Is the feature opt-in and clear before data is shared?
- Can the user revoke, delete, or expire the shared data?
- Does the implementation avoid storing raw secrets, share tokens, payment credentials, or AI prompts when a hash, id, or bounded record is enough?
- Does account or pantry-data deletion remove public views and derived share records?
- Are logs safe: request ids, counts, and status only, with no pantry item names, notes, tokens, or payment details?
- Is the response scoped to the minimum public fields needed?
- Does the UI tell the user what the recipient can and cannot access?
- Does the feature still work when copy/share/browser APIs are blocked?
- Is there a test for expired, revoked, unauthorized, or invalid access?

## Feature-Specific Checks

### Sharing

- Use opaque server-side tokens for public links.
- Persist only token hashes.
- Keep public responses view-only.
- Expire links by default.
- Provide revocation when the signed-in owner is still on the page.

### AI Or OCR

- Treat pantry contents, receipt images, and shelf photos as private input.
- Show exactly what will be sent before sending it.
- Store extracted suggestions only after user confirmation.
- Keep AI/OCR as suggestions, not automatic inventory mutations.

### Payments

- Keep payment provider boundaries explicit.
- Do not store card or billing secrets in PantryList.
- Label sponsored offers, affiliate links, or incentives as paid/partner content.

### Exports

- Include export format and generation time.
- Include query/data limits when relevant.
- Do not create shared permissions as a side effect of export.

## Current Decision

Temporary shopping-list links now use server-backed, expiring, revocable tokens. The URL carries an opaque token; the backend stores only the token hash and deletes owner share records during pantry-data deletion.
