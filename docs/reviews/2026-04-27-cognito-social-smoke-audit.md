# Cognito Social Smoke Audit - 2026-04-27

## Scope

Audit local PantryList runtime after enabling Cognito, Google, and Facebook
providers in the `pantrylist-dev-cognito` stack in `us-east-1`.

## Results

| Area | Result |
| --- | --- |
| AWS stack | `pantrylist-dev-cognito` is `UPDATE_COMPLETE`; outputs include `AllowedProviders=COGNITO,Google,Facebook`, `UserPoolId=us-east-1_g049euqS7`, `UserPoolClientId=5j45rtmrleqsno9dm1qnansfg7`, and Cognito domain `https://pantrylist-dev-765932874577.auth.us-east-1.amazoncognito.com`. |
| Local containers | MongoDB, backend, and frontend are running on high local ports `37917`, `39173`, and `48673`. |
| Backend HTTP smoke | `/api/healthz` returns `200`; `/api/auth/cognito/providers` returns `{"providers":["COGNITO","Google","Facebook"]}`; provider login endpoints return `302` with PKCE `code_challenge_method=S256`. |
| Tests and builds | Backend lint, unit tests, e2e, and build passed. Frontend unit tests, build, and Playwright e2e passed. Cognito CDK build and synth passed. |
| Secrets | `.env.docker.local` is ignored by git; heuristic secret scan returned `count = 0`; CDK synth uses Secrets Manager dynamic references for social provider secrets. |
| Dependency audit | Backend full audit is clean after updating `@swc/cli` to `^0.8.1`; infra full audit is clean; frontend production audit is clean. Frontend full dev audit still reports Angular CLI/build-tooling findings with no non-breaking fix path from `npm audit fix`. |
| Cognito hosted login | Initially failed with `Login pages unavailable`. Fixed by adding `AWS::Cognito::ManagedLoginBranding` with `UseCognitoProvidedValues: true` and redeploying. After deploy, Cognito hosted login renders sign-in, social buttons, forgot-password, and sign-up UI. |
| Facebook provider | Browser smoke reaches the Facebook login page with Cognito `/oauth2/idpresponse` as redirect target. Full callback was not completed because credentials were not entered. |
| Google provider | Browser smoke reaches Google, but Google blocks with `redirect_uri_mismatch`. The Google OAuth client must add this exact authorized redirect URI: `https://pantrylist-dev-765932874577.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`. |

## Changes Made During Audit

- Added default Cognito Managed Login branding in `infra/cognito/lib/pantrylist-cognito-stack.ts`.
- Deployed the updated CDK stack to `us-east-1`; CloudFormation created `ManagedLoginBranding`.
- Updated backend dev dependency `@swc/cli` to `^0.8.1`, clearing backend dev dependency audit findings.
- Removed unused local-password/claim DTOs and password-policy utility from backend source so Cognito remains the only active auth authority.

## Pending Actions

1. Rotate the Google and Facebook secrets that were pasted into chat, update AWS Secrets Manager, and redeploy the Cognito stack.
2. In Google Cloud Console, edit the OAuth web client and add the authorized redirect URI: `https://pantrylist-dev-765932874577.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`.
3. Re-run browser smoke for Google and complete one real login callback with a test user.
4. Decide later whether to migrate Angular CLI/build tooling to a newer major version; do not force this now just to satisfy dev-only audit findings.

## Evidence

- AWS CLI `describe-stacks` and `describe-user-pool-client` outputs from this audit.
- Playwright browser smoke screenshots saved in `C:\Users\lince\Documents\GitHub\Codex\Output`.
- AWS documentation: `AWS::Cognito::ManagedLoginBranding` supports `UseCognitoProvidedValues: true` for default managed login style.
