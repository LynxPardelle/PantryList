# Despensa Lista Cognito CDK

This CDK app creates the AWS Cognito side of Despensa Lista authentication:

- Cognito User Pool with email sign-in and email recovery.
- Cognito Managed Login v2 prefix domain.
- OAuth app client with Authorization Code flow.
- Local callback/logout URLs for `http://localhost:48673`.
- Optional Dokploy HTTPS callback/logout URLs.
- Optional Google and Facebook social login, with client secrets stored in SSM
  SecureString parameters and Cognito IdPs updated by helper script.

When `includeServerlessBackend=true`, it also creates the staged Lambda/API Gateway
backend using the existing DynamoDB repositories and Cognito stack.

When `includeProductionInfra=true`, it also creates the production application
support stack:

- DynamoDB tables for users, products, product types, and inventory lots.
- IAM permissions for the Dokploy EC2 instance role.
- ACM certificate for `despensalista.lynxpardelle.com` plus the planned
  `test.` and `dev.` subdomains.
- CloudFront distribution with a Dokploy EC2 HTTP origin.
- Route53 A/AAAA aliases for the production domain.

No Google/Facebook client secret belongs in this repository.

## Why CDK

The application code already expects Cognito Hosted UI redirects, Cognito token
verification, and HttpOnly app cookies. CDK keeps the User Pool, app client,
domain, callbacks, and supported-provider list reproducible.

## Prerequisites

- AWS CLI authenticated to the target account.
- A unique Cognito domain prefix, for example `despensalista-dev-alec`.
- Optional Google OAuth client ID and secret.
- Optional Facebook app ID and secret.
- Optional Dokploy public URL, for example `https://despensalista.example.com`.

If this is the first CDK deployment in the account/region, run:

```powershell
npx cdk bootstrap aws://<account-id>/<region>
```

## Social Provider Redirects

Social provider apps must redirect back to Cognito, not directly to Despensa Lista.

For a Cognito domain like:

```text
https://despensalista-dev-alec.auth.us-east-1.amazoncognito.com
```

configure the social provider redirect URI as:

```text
https://despensalista-dev-alec.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

For Google, also set the authorized JavaScript origin to the Cognito domain:

```text
https://despensalista-dev-alec.auth.us-east-1.amazoncognito.com
```

## Store Provider Secrets

Create provider secrets in SSM Parameter Store SecureString parameters:

```powershell
aws ssm put-parameter `
  --name /despensalista/dev/google-client-secret `
  --type SecureString `
  --value "<google-client-secret>"

aws ssm put-parameter `
  --name /despensalista/dev/facebook-client-secret `
  --type SecureString `
  --value "<facebook-client-secret>"
```

If a parameter already exists, update it with:

```powershell
aws ssm put-parameter `
  --name /despensalista/dev/google-client-secret `
  --type SecureString `
  --value "<new-google-client-secret>" `
  --overwrite
```

Prefer entering real secret values outside shell history when possible, for
example through the AWS Console or an approved secret-management workflow.

You can also use the bundled helper. It prompts for secrets securely and writes
them to SSM SecureString parameters:

```powershell
.\scripts\Set-SocialProviderSecrets.ps1 `
  -Google `
  -Facebook `
  -Region us-east-1 `
  -Stage dev `
  -WriteDeployScript
```

`Deploy-SocialProviders.local.ps1` is ignored by git. It can contain provider
names and parameter names, but it must never contain provider client secrets.

## Configure Cognito Social Providers From SSM

Cognito social IdP `client_secret` values cannot be sourced from SSM
SecureString dynamic references in CloudFormation. Deploy the Cognito pool and
client first, then upsert the social IdPs from SSM:

```powershell
.\scripts\Set-CognitoSocialProvidersFromSsm.ps1 `
  -UserPoolId <user-pool-id> `
  -UserPoolClientId <user-pool-client-id> `
  -GoogleClientId <google-oauth-client-id> `
  -Region us-east-1
```

Pass `-FacebookClientId <facebook-app-id>` only after the Meta app can be made
active.

Then deploy CDK with:

```powershell
--context externallyManagedSocialProviders=Google
```

This keeps the Cognito app client and backend Lambda environment aligned with
the externally managed IdPs without storing provider secrets in CloudFormation.

## Install And Validate

```powershell
cd infra/cognito
npm ci
npm run build
npm run synth
```

Validate the social-provider template shape without real secrets:

```powershell
npx cdk synth `
  --context domainPrefix=despensalista-dev-example `
  --context productionFrontendBaseUrl=https://despensalista.example.com `
  --context externallyManagedSocialProviders=Google
```

## Deploy: Local Cognito Only

This creates a User Pool with Cognito-hosted email/password accounts and local
callback URLs, but no Google/Facebook IdPs:

```powershell
npx cdk deploy `
  --context stage=dev `
  --context awsRegion=us-east-1 `
  --context domainPrefix=despensalista-dev-alec
```

## Deploy: Google And Local Callback URLs

```powershell
npx cdk deploy `
  --context stage=dev `
  --context awsRegion=us-east-1 `
  --context domainPrefix=despensalista-dev-alec `
  --context productionFrontendBaseUrl=https://despensalista.example.com `
  --context externallyManagedSocialProviders=Google
```

Use `removalPolicy=retain` by default. Use `removalPolicy=destroy` only for
throwaway environments.

## Deploy: Production Serverless App

This creates production Cognito plus the serverless production stack for
`https://despensalista.lynxpardelle.com`:

```powershell
npx cdk deploy despensalista-prod-cognito despensalista-prod-serverless-backend `
  --require-approval never `
  --context projectName=despensalista `
  --context stage=prod `
  --context awsRegion=us-east-1 `
  --context includeServerlessBackend=true `
  --context removalPolicy=retain `
  --context deletionProtection=true `
  --context domainPrefix=despensalista-prod-765932874577 `
  --context productionFrontendBaseUrl=https://despensalista.lynxpardelle.com `
  --context serverlessFrontendBaseUrl=https://despensalista.lynxpardelle.com `
  --context appDomainName=despensalista.lynxpardelle.com `
  --context hostedZoneId=Z05088763QG63CC5SE7PN `
  --context hostedZoneName=lynxpardelle.com `
  --context externallyManagedSocialProviders=Google
```

Do not put OAuth client secrets in command-line context. Store them in SSM
SecureString parameters and pass only non-secret provider IDs to
`Set-CognitoSocialProvidersFromSsm.ps1`.

## Apply Outputs To Despensa Lista

After deploy, get stack outputs:

```powershell
aws cloudformation describe-stacks `
  --stack-name despensalista-dev-cognito `
  --query "Stacks[0].Outputs"
```

Set these in `.env.docker.local`, `.env.production.local`, or Dokploy:

```env
COGNITO_ENABLED=true
COGNITO_ISSUER=<CognitoIssuer output>
COGNITO_DOMAIN=<CognitoDomain output>
COGNITO_CLIENT_ID=<UserPoolClientId output>
COGNITO_CLIENT_SECRET=
COGNITO_REDIRECT_URI=http://localhost:48673/api/auth/cognito/callback
COGNITO_LOGOUT_REDIRECT_URI=http://localhost:48673/login
COGNITO_SCOPES=openid email profile
COGNITO_ALLOWED_PROVIDERS=COGNITO,Google
```

For Dokploy, use:

```env
COGNITO_REDIRECT_URI=https://<your-dokploy-domain>/api/auth/cognito/callback
COGNITO_LOGOUT_REDIRECT_URI=https://<your-dokploy-domain>/login
```

## Useful Outputs

- `UserPoolId`: Cognito User Pool ID.
- `UserPoolClientId`: value for `COGNITO_CLIENT_ID`.
- `CognitoIssuer`: value for `COGNITO_ISSUER`.
- `CognitoDomain`: value for `COGNITO_DOMAIN`.
- `SocialProviderRedirectUri`: URL to configure in Google/Facebook.
- `AllowedProviders`: value for `COGNITO_ALLOWED_PROVIDERS`.
- `DynamoDbUsersTable`: value for `DYNAMODB_USERS_TABLE`.
- `DynamoDbProductsTable`: value for `DYNAMODB_PRODUCTS_TABLE`.
- `DynamoDbProductTypesTable`: value for `DYNAMODB_PRODUCT_TYPES_TABLE`.
- `DynamoDbInventoryLotsTable`: value for
  `DYNAMODB_INVENTORY_LOTS_TABLE`.
- `CloudFrontDistributionId`: distribution to invalidate after production
  redeploys when needed.
- `CloudFrontDomainName`: generated CloudFront hostname backing the Route53
  alias.
