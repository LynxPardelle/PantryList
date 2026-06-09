# Stripe Monetization Discovery

Date: 2026-06-09

Status: Product discovery and provider decision. This is not a live billing implementation.

## Decision

- Use Stripe as the default provider for future web/PWA payments.
- Start with Stripe Billing plus Checkout Sessions for subscriptions.
- Model PantryList plans with Stripe Products and Prices when billing is implemented.
- Use Stripe Customer Portal for self-service subscription management.
- Keep PantryList out of raw card handling. Do not store card data, payment method data, or billing secrets in app data.

Sources:

- Stripe Checkout overview: https://docs.stripe.com/payments/checkout
- Stripe subscriptions overview: https://docs.stripe.com/payments/subscriptions
- Stripe Customer Portal API: https://docs.stripe.com/api/customer_portal/sessions

## Current Batch Scope

- Profile now shows a Free/Plus/AI Credits monetization discovery panel.
- Users can register local interest in Plus or AI Credits.
- Interest events stay in browser localStorage only.
- Stored event fields are limited to local event id, `planId`, provider, event type, and timestamp.
- No backend route, Stripe SDK, Stripe key, Checkout Session, Customer, Subscription, Price, webhook, invoice, or payment method was added.

## Proposed Plan Boundary

### Free

- Manual inventory.
- Expiration and use-first views.
- Shopping lists.
- Basic export.

### Plus Household

- Full household collaboration packaging.
- Backups and restore/version history.
- Savings and waste reports.
- Advanced multi-store planning.

### AI Capture Credits

- Receipt OCR.
- Shelf/photo recognition.
- Expiration-date OCR.
- Barcode/product enrichment.

AI outputs must stay as suggestions until the user confirms them.

## Stripe Integration Direction

When moving beyond discovery:

1. Add backend-only Stripe SDK configuration with secret values outside git.
2. Create Checkout Sessions with `mode=subscription` for household Plus.
3. Use Stripe Price ids from environment/config, not hardcoded live ids.
4. Create Stripe Customer records linked to app user ids through metadata or a local billing profile table.
5. Verify subscription status only through trusted server-side webhook state.
6. Add Customer Portal session creation for plan changes, cancellation, and payment method management.
7. Keep billing status readable in profile, but avoid exposing raw Stripe objects to the frontend.
8. Add a separate privacy/security review before any real billing, receipt OCR, or AI capture provider work.

## Open Questions

- First paid unit: household subscription vs individual subscription.
- First launch path: PWA web billing through Stripe vs Android-first Google Play billing later.
- Trial policy: free trial, founder coupon, or no trial.
- Price test: monthly and annual MXN ranges.
- Whether AI credits should be included in Plus or remain usage-based.
- Whether expired subscriptions should keep read/export access while blocking new premium actions.

## Risks

- Billing errors can lock users out or create support burden.
- AI capture has variable cost and privacy risk.
- Sponsored or affiliate models can damage trust if mixed with inventory logic.
- Lifetime plans must exclude unlimited AI and clearly scope cloud obligations.
