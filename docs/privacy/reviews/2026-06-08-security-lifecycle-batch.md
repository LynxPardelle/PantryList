# Privacy Review: Security Lifecycle Batch

Date: 2026-06-09 CT

## Scope

- Retention policy metadata for archived pantry records and temporary shopping shares.
- Optional auto-delete support for archived records through Mongo TTL and DynamoDB TTL fields when explicitly enabled.
- Step-up gate for destructive profile actions when `AUTH_STEP_UP_ENABLED=true`.
- Global Cognito sign-out from the profile page.

## Required Checks

- Data touched: account identity subject IDs, Cognito session state, archived pantry records, temporary shopping-share retention metadata, and local profile security status.
- User visibility: profile shows retention policy, step-up status, and explicit confirmation text for global sign-out, pantry deletion, and account deletion.
- Consent: global sign-out, local pantry deletion, and account deletion remain explicit user actions with confirmation text.
- Retention: archived records are manually retained by default; auto-delete requires `ARCHIVED_RECORD_AUTO_DELETE_ENABLED=true`. Temporary shopping-share retention is exposed by policy and remains expiry-based.
- Access control: only the authenticated user can manage their own sessions and destructive profile actions. Household pantry deletion remains owner-only.
- External processors: Cognito receives global sign-out and account deletion admin calls. No new AI, receipt, payment, or retailer processor is introduced.
- Abuse case: accidental destructive action. Mitigation is XSRF validation, exact confirmation text, optional step-up, and local session clearing after account/session actions.
- Rollback: disable `AUTH_STEP_UP_ENABLED` or keep `ARCHIVED_RECORD_AUTO_DELETE_ENABLED=false`; remove the new profile sessions endpoint if Cognito admin permissions are not deployed.

## Decision

- Approved for implementation: yes.
- Blockers: production role must include `cognito-idp:AdminUserGlobalSignOut` before global sign-out is relied on.
- Follow-up required before release: decide whether to enable optional MFA in Cognito and whether archived auto-delete should remain off or move to a scheduled/backfill migration.
