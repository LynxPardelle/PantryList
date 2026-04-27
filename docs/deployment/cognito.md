# Cognito Setup For PantryList

PantryList now uses Cognito as the authentication authority. The application
code is ready; this document covers the AWS setup that makes real Google,
Facebook, and Cognito-hosted email sign-in work.

## Source Of Truth

Use the CDK app in `infra/cognito` for repeatable environments. Do not create
production auth resources only by hand in the AWS Console.

## URLs To Understand

PantryList application callback:

```text
https://<your-app-domain>/api/auth/cognito/callback
```

Cognito social provider callback:

```text
https://<your-cognito-domain>/oauth2/idpresponse
```

These are different URLs. Google and Facebook must use the Cognito
`/oauth2/idpresponse` URL. PantryList itself uses `/api/auth/cognito/callback`.

## Safe Setup Order

1. Choose AWS account, region, stage, and a globally unique Cognito domain
   prefix.
2. Run `npm ci`, `npm run build`, and `npm run synth` in `infra/cognito`.
3. Deploy once with Cognito-only if you want outputs before social setup.
4. Configure Google and Facebook apps with the Cognito domain and
   `/oauth2/idpresponse` redirect URL.
5. Store provider secrets in AWS Secrets Manager.
6. Deploy again with `enableGoogle=true` and/or `enableFacebook=true`.
7. Copy CDK outputs into `.env.docker.local`, `.env.production.local`, or
   Dokploy.
8. Smoke-test login through `http://localhost:48673/login`.

## Local Callback Values

For local Docker development:

```env
COGNITO_REDIRECT_URI=http://localhost:48673/api/auth/cognito/callback
COGNITO_LOGOUT_REDIRECT_URI=http://localhost:48673/login
```

AWS Cognito allows HTTP callback URLs for `localhost` testing. Use HTTPS for
Dokploy and any non-local deployment.

## Dokploy Callback Values

For Dokploy:

```env
COGNITO_REDIRECT_URI=https://<your-dokploy-domain>/api/auth/cognito/callback
COGNITO_LOGOUT_REDIRECT_URI=https://<your-dokploy-domain>/login
```

## Provider Secrets

Provider secrets stay in AWS Secrets Manager and are referenced by secret name
from CDK. Example names:

```text
/pantrylist/dev/google-client-secret
/pantrylist/dev/facebook-client-secret
```

Never commit provider client secrets, Cognito client secrets, or local
environment files.

## Verification Checklist

- `infra/cognito`: `npm run build`
- `infra/cognito`: `npm run synth`
- `infra/cognito`: social-provider synth with context values
- Backend: `npm run build`
- Frontend: `npm run build`
- Local smoke: Cognito login redirect starts from `/login`
- Provider apps: redirect URI is exactly
  `https://<your-cognito-domain>/oauth2/idpresponse`

## References

- AWS CDK Cognito construct docs:
  <https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito-readme.html>
- AWS CDK app client callback URL requirements:
  <https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.CfnUserPoolClientProps.html>
- AWS CloudFormation social IdP provider details:
  <https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolidentityprovider.html>
- AWS Cognito domain prefix and Managed Login:
  <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-assign-domain-prefix.html>
- AWS Cognito social IdP setup:
  <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html>
