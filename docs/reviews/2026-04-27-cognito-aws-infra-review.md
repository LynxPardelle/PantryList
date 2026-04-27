# Cognito AWS Infrastructure Review

Reviewed: 2026-04-27 Central Time

Scope: CDK infrastructure for PantryList Cognito User Pool, Managed Login
domain, OAuth app client, and optional Google/Facebook social IdPs.

## Review Summary

| Area | Result |
|------|--------|
| User Pool | Email sign-in, email verification, email recovery, strong password policy, retained by default. |
| Hosted UI / Managed Login | Cognito prefix domain with Managed Login version `2`. |
| App Client | Authorization Code OAuth flow, `openid email profile` scopes, token revocation enabled, public client for PKCE. |
| Local callback | `http://localhost:48673/api/auth/cognito/callback` and `http://localhost:48673/login`. |
| Dokploy callback | Optional `productionFrontendBaseUrl` context adds HTTPS app callback/logout URLs. |
| Social IdPs | Google/Facebook are optional and read client secrets through AWS Secrets Manager dynamic references. |
| Secrets | No provider secrets are stored in the repository. |

## Security Review

| Abuse case | Impact | Mitigation |
|------------|--------|------------|
| Provider secret committed to git | Credential compromise | CDK accepts Secrets Manager secret names and emits dynamic references, not literal secrets. |
| Wrong OAuth redirect configured in Google/Facebook | Login fails or redirects unpredictably | Docs separate PantryList app callback from Cognito `/oauth2/idpresponse`. |
| Accidental user pool deletion | Account/data loss | CDK applies `RemovalPolicy.RETAIN` by default. |
| User enumeration | Easier account discovery | App client sets `PreventUserExistenceErrors=ENABLED`. |
| Restoring local auth fallback | Split auth authority | CDK only provisions Cognito; app code remains Cognito-only. |

## Evidence

| Check | Result |
|-------|--------|
| `infra/cognito npm install` | Added CDK dependencies; `found 0 vulnerabilities`. |
| `infra/cognito npm run build` | Passed. |
| `infra/cognito npm run synth` | Passed; generated User Pool, domain, app client, outputs. |
| Social-provider synth | Passed with Google/Facebook enabled and dynamic Secrets Manager references. |
| `infra/cognito npm audit --omit=dev --json` | `total = 0` vulnerabilities. |
| Backend build | Passed. |
| Frontend build | Passed. |

## Not Deployed Yet

No `cdk deploy` was run. Deployment still needs an explicit AWS account/region,
a globally unique Cognito domain prefix, and real Google/Facebook provider app
credentials stored in AWS Secrets Manager.
