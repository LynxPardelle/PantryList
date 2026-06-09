# Server-Backed Shopping Savings Batch Privacy Review

## Scope

- Data touched: saved shopping lists, saved shopping list items, household-scoped pantry owner ids, price estimates, shopping locations, waste totals, and simulated Plus preview state.
- User visibility: users explicitly press `Guardar lista`; UI shows whether a list is account-backed or local fallback. Plus preview is disabled and does not collect billing data.
- Consent: saved shopping lists are opt-in. Waste summary is derived from waste events the user already recorded. Paywall preview has no payment action.
- Retention: saved shopping lists remain until the user deletes the list, deletes pantry data, exports data, or deletes the account. Export now includes saved shopping lists. Pantry/account delete removes them.
- Access control: household viewers can read saved lists through existing read scope. Owners/editors can create and delete through existing write scope. Lists are owner-scoped to the pantry owner.
- External processors: no new external processor. Optional metrics webhook remains aggregate-only from prior batch. Voice capture remains browser-provided from prior batch.
- Abuse case: a household editor could save a list containing sensitive item names. Mitigation is existing household role control and explicit delete/export visibility.
- Rollback: remove `/pantry/shopping-lists` endpoints and hide frontend saved-list sync; local fallback can remain as non-server storage if needed.

## Decision

- Approved for implementation: yes.
- Blockers: none.
- Follow-up required before release: clarify in privacy copy that server-backed saved lists sync across devices and are included in export/delete.
