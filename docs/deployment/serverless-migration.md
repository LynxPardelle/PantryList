# Despensa Lista Serverless Migration

Date: 2026-07-09 Central Time

## Source Pattern

This migration follows the portfolio AWS flow:

- protected promotion path: `dev -> tst -> prod`
- GitHub Environments per stage
- OIDC deploy role per environment through `AWS_ROLE_ARN`
- CDK validation before deploy
- `tst` deploys only from a merge commit whose second parent is `origin/dev`
- `prod` deploys only from a merge commit whose second parent is `origin/tst`

## Current Cut

The first serverless cut is deliberately small:

- Existing Nest/Fastify backend runs behind one Lambda handler.
- API Gateway HTTP API forwards all routes to that Lambda.
- Existing DynamoDB repositories stay in use.
- Existing Cognito CDK stack provides user pool, app client, issuer, and domain.
- Current Dokploy/EC2 runtime remains the rollback path until serverless smoke
  passes per environment.

This is not yet the final microservice split. Route-family Lambdas, Step
Functions, EventBridge/SQS, custom API domains, CloudFront frontend hosting, and
EC2/Dokploy retirement stay behind separate verified cuts.

## Deploy Variables

Each GitHub Environment needs:

- `AWS_ROLE_ARN`
- `AWS_REGION`, usually `us-east-1`
- `COGNITO_DOMAIN_PREFIX`
- `FRONTEND_BASE_URL`

Production also requires these so the existing Cognito social providers are not
removed by a prod stack update:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET_NAME`
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET_NAME`

## Local Commands

```bash
cd infra/cognito
npm ci
npm run build
npm run synth
```

Serverless synth commands exist for stage checks:

```bash
npm run synth:dev
npm run synth:tst
npm run synth:prod
```

## Validation Before Cutover

- backend Lambda `/api/healthz` returns `{"status":"ok","service":"despensalista-backend"}`
- Cognito providers endpoint returns expected providers for the stage
- authenticated pantry overview works against DynamoDB
- account deletion and global sign-out still have Cognito IAM permissions
- frontend can call the API with credentials and XSRF headers
- CloudWatch logs show no cold-start bootstrap errors
- rollback to Dokploy/EC2 remains available until production browser smoke passes
