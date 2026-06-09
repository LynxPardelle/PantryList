# Privacy Review: Monetization Discovery With Stripe Decision

## Data Touched

- Browser-local monetization discovery events.
- Event fields: local event id, plan id, provider (`stripe`), event type, and timestamp.
- Existing profile UI context, without adding profile or payment fields to stored events.

## New Collection

- No backend collection was added.
- No Stripe API call was added.
- No card, payment method, billing address, invoice, customer id, subscription id, or checkout session id is collected.
- No email, username, household id, pantry item, receipt image, or inventory content is stored in monetization discovery events.

## User Visibility And Control

- Profile explicitly labels Stripe as the chosen future provider.
- Interest controls are discovery actions, not buy or subscribe actions.
- UI states that no checkout real happens in this batch.
- Users can clear local monetization discovery events from the profile page.

## Retention

- Discovery events remain in the current browser localStorage until cleared.
- Only the newest 20 discovery events are retained locally.
- Deleting PantryList backend account data does not affect this browser-local discovery storage in this batch.

## External Processors

- Stripe is selected as the future billing provider, but no Stripe processor call is introduced by this change.
- Future Stripe integration must get a new privacy/security review before adding Checkout Sessions, Customer records, webhooks, billing portal sessions, or subscription status persistence.

## Risk Notes

- Real payments must keep all Stripe secret keys server-side.
- Stripe webhooks must be verified before granting Plus entitlement.
- PantryList must not store raw card data.
- AI capture credits need a separate privacy review because receipt and shelf photos can expose sensitive purchase and household data.
