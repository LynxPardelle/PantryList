# Despensa Lista Cognito CDK

This CDK app creates the AWS Cognito side of Despensa Lista authentication:

- Cognito User Pool with email sign-in and email recovery.
- Cognito Managed Login v2 prefix domain.
- OAuth app client with Authorization Code flow.
- Local callback/logout URLs for `http://localhost:48673`.
- Optional Dokploy HTTPS callback/logout URLs.
- Optional Google and Facebook social IdPs that read provider secrets from AWS
  Secrets Manager dynamic references.

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
domain, callbacks, and social IdPs reproducible without configuring them by
hand in the console every time.

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

Create provider secrets in AWS Secrets Manager before deploying with social
providers enabled:

```powershell
aws secretsmanager create-secret `
  --name /despensalista/dev/google-client-secret `
  --secret-string "<google-client-secret>"

aws secretsmanager create-secret `
  --name /despensalista/dev/facebook-client-secret `
  --secret-string "<facebook-client-secret>"
```

If a secret already exists, update it with:

```powershell
aws secretsmanager put-secret-value `
  --secret-id /despensalista/dev/google-client-secret `
  --secret-string "<new-google-client-secret>"
```

Prefer entering real secret values outside shell history when possible, for
example through the AWS Console or an approved secret-management workflow.

You can also use the bundled helper. It prompts for secrets securely, writes
them to AWS Secrets Manager, and can write a local deploy script with non-secret
provider IDs and secret names:

```powershell
.\scripts\Set-SocialProviderSecrets.ps1 `
  -Google `
  -Facebook `
  -Region us-east-1 `
  -Stage dev `
  -WriteDeployScript
```

`Deploy-SocialProviders.local.ps1` is ignored by git. It can contain provider
client IDs and secret names, but it must never contain provider client secrets.

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
  --context enableGoogle=true `
  --context googleClientId=google-client-id.example.apps.googleusercontent.com `
  --context googleClientSecretName=/despensalista/dev/google-client-secret `
  --context enableFacebook=true `
  --context facebookClientId=facebook-app-id-example `
  --context facebookClientSecretName=/despensalista/dev/facebook-client-secret
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

## Deploy: Google, Facebook, Local, And Dokploy

```powershell
npx cdk deploy `
  --context stage=dev `
  --context awsRegion=us-east-1 `
  --context domainPrefix=despensalista-dev-alec `
  --context productionFrontendBaseUrl=https://despensalista.example.com `
  --context enableGoogle=true `
  --context googleClientId=<google-oauth-client-id> `
  --context googleClientSecretName=/despensalista/dev/google-client-secret `
  --context enableFacebook=true `
  --context facebookClientId=<facebook-app-id> `
  --context facebookClientSecretName=/despensalista/dev/facebook-client-secret
```

Use `removalPolicy=retain` by default. Use `removalPolicy=destroy` only for
throwaway environments.

## Deploy: Production AWS App Support

This creates production Cognito plus the production support stack for
`https://despensalista.lynxpardelle.com`:

```powershell
$env:DESPENSALISTA_ORIGIN_VERIFY_HEADER_VALUE = aws ssm get-parameter `
  --region us-east-1 `
  --name "/despensalista/prod/cloudfront-origin-verify-header" `
  --with-decryption `
  --query "Parameter.Value" `
  --output text

try {
  npx cdk deploy despensalista-prod-cognito despensalista-prod-app `
    --require-approval never `
    --context stage=prod `
    --context awsRegion=us-east-1 `
    --context domainPrefix=despensalista-prod-765932874577 `
    --context productionFrontendBaseUrl=https://despensalista.lynxpardelle.com `
    --context includeProductionInfra=true `
    --context appDomainName=despensalista.lynxpardelle.com `
    --context hostedZoneId=Z05088763QG63CC5SE7PN `
    --context hostedZoneName=lynxpardelle.com `
    --context originDomainName=origin.despensalista.lynxpardelle.com `
    --context originRecordName=origin.despensalista.lynxpardelle.com `
    --context originTargetIp=54.198.41.242 `
    --context originProtocolPolicy=https-only `
    --context enableIpv6=false `
    --context originVerifyHeaderName=X-DespensaLista-Origin-Verify `
    --context originVerifyHeaderParameterName=/despensalista/prod/cloudfront-origin-verify-header `
    --context ec2RoleName=EC2TraefikRoute53DNS01Role `
    --context deletionProtection=true `
    --context enableGoogle=true `
    --context googleClientId=<google-oauth-client-id> `
    --context googleClientSecretName=/despensalista/prod/google-client-secret `
    --context enableFacebook=true `
    --context facebookClientId=<facebook-app-id> `
    --context facebookClientSecretName=/despensalista/prod/facebook-client-secret
} finally {
  Remove-Item Env:\DESPENSALISTA_ORIGIN_VERIFY_HEADER_VALUE -ErrorAction SilentlyContinue
}
```

Do not put OAuth client secrets in command-line context. Store them in Secrets
Manager and reference only the secret names.
Do not put the CloudFront origin verification value in command-line context.
Load it from SSM SecureString into `DESPENSALISTA_ORIGIN_VERIFY_HEADER_VALUE` for
the deploy process, then clear that environment variable.

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
COGNITO_ALLOWED_PROVIDERS=COGNITO,Google,Facebook
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
