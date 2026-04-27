---
goal: Add AWS Cognito infrastructure for real Hosted UI and social sign-in
version: 1.0
date_created: 2026-04-27
last_updated: 2026-04-27
owner: Codex
status: Completed
tags: [aws, cognito, cdk, auth, google, facebook, dokploy]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan adds a deployable AWS CDK stack for PantryList Cognito authentication.
The stack creates a Cognito User Pool, Managed Login domain, OAuth app client,
and optional Google/Facebook social identity providers without storing provider
secrets in git.

## Requirements

- **REQ-001**: Create versioned infrastructure for Cognito Hosted UI / Managed
  Login.
- **REQ-002**: Support local callback/logout URLs for `localhost:48673`.
- **REQ-003**: Support a Dokploy HTTPS domain through context configuration.
- **REQ-004**: Support Google and Facebook IdPs without committing secrets.
- **REQ-005**: Output the exact env values PantryList needs:
  `COGNITO_ISSUER`, `COGNITO_DOMAIN`, `COGNITO_CLIENT_ID`, and provider list.
- **SEC-001**: Store Google/Facebook provider secrets in AWS Secrets Manager,
  referenced by name from CDK.
- **SEC-002**: Keep Cognito as the only auth authority; do not restore local
  password fallback.
- **SEC-003**: Use Authorization Code flow and the existing app-side PKCE flow.
- **SEC-004**: Do not deploy automatically until AWS account, region, domain
  prefix, and provider credentials are explicit.

## Tasks

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Verify current repo state and official AWS Cognito/CDK constraints. | Yes | 2026-04-27 |
| TASK-002 | Add CDK app under `infra/cognito`. | Yes | 2026-04-27 |
| TASK-003 | Model User Pool, Managed Login v2 domain, OAuth app client, local/Dokploy callbacks, and optional social IdPs. | Yes | 2026-04-27 |
| TASK-004 | Add setup/deploy documentation and context example. | Yes | 2026-04-27 |
| TASK-005 | Verify CDK build, synth, social-provider synth, dependency audit, and secret scan. | Yes | 2026-04-27 |
| TASK-006 | Update planning, findings, progress, and commit. | Yes | 2026-04-27 |

## Risks

- **RISK-001**: Cognito prefix domains must be globally unique.
- **RISK-002**: Google/Facebook OAuth apps must use the Cognito
  `/oauth2/idpresponse` URL, not the PantryList callback URL.
- **RISK-003**: CDK deployment may require AWS CDK bootstrap in the target
  account/region.
- **RISK-004**: Real social login cannot be smoke-tested until provider apps
  and Secrets Manager secrets exist in AWS.
