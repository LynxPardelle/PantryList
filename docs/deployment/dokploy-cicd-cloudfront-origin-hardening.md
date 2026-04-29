# Dokploy CI/CD And CloudFront Origin HTTPS Plan

Date: 2026-04-29 Central Time

## Objective

Make the PantryList production deployment visible and managed in Dokploy, with
GitHub-driven CI/CD for `main`, then harden the CloudFront to EC2 origin leg so
CloudFront connects to Traefik over HTTPS instead of HTTP.

## Current State

- Public application: `https://pantrylist.lynxpardelle.com`
- Dokploy panel: `https://dokploy.lynxpardelle.com/`
- GitHub repository: `LynxPardelle/PantryList`
- Production branch: `main`
- Current runtime: manual SSM-created Docker Compose stack on the Dokploy EC2
  host.
- Current edge: CloudFront terminates HTTPS for viewers and connects to the EC2
  origin over HTTP.

## Planned Rollout

### 1. Preflight

- Confirm Dokploy API access using an expiring API key without storing it in the
  repository.
- Inventory current Dokploy projects and environments.
- Confirm AWS CloudFront, Route53, EC2, Cognito, and DynamoDB state.
- Confirm the repository has a Dokploy-specific compose file that does not
  publish public host ports.

### 2. Dokploy-Managed Service

- Create or reuse a `PantryList` project in Dokploy.
- Create or reuse a `production` environment.
- Create a Docker Compose service for `main`.
- Configure GitHub source:
  - owner: `LynxPardelle`
  - repository: `PantryList`
  - branch: `main`
  - compose path: `docker-compose.dokploy.prod.yml`
  - auto deploy: enabled
- Store runtime environment values in Dokploy, not in git.
- Deploy the service while keeping the existing manual stack available for
  rollback.

### 3. Origin HTTPS Hardening

- Create `origin.pantrylist.lynxpardelle.com` in Route53 pointing to the Dokploy
  EC2 public IP.
- Attach that origin hostname to the Dokploy-managed compose service with HTTPS
  enabled through Dokploy/Traefik.
- Update the CloudFront origin domain from the raw EC2 DNS name to
  `origin.pantrylist.lynxpardelle.com`.
- Change CloudFront origin protocol policy to HTTPS-only.
- Keep the viewer domain as `pantrylist.lynxpardelle.com`.

## Verification

- Dokploy UI shows the PantryList project, production environment, compose
  service, deployment logs, and GitHub auto-deploy settings.
- A deploy from `main` can be triggered from Dokploy.
- The production domain returns:
  - `/healthz` -> `200`
  - `/api/healthz` -> `200`
  - `/login/` -> `200`
  - `/api/auth/cognito/providers` -> `200`
- Cognito Hosted UI starts from the production domain.
- CloudFront reports the distribution as `Deployed`.
- CloudFront origin protocol is HTTPS-only.

## Rollback

- If the Dokploy-managed compose service fails, keep CloudFront pointed at the
  existing manual runtime and stop the failed Dokploy service.
- If the HTTPS origin fails, revert CloudFront to the previous EC2 origin and
  HTTP-only origin protocol while preserving the Dokploy service for debugging.
- If CI/CD behaves incorrectly, disable Dokploy auto deploy and continue manual
  deployments from the Dokploy UI until the webhook/source configuration is
  corrected.

## Security Notes

- The Dokploy API key is temporary and must not be written to tracked files,
  shell profile files, `.env` files, or documentation.
- The origin hostname can still be reached directly unless an additional
  CloudFront-only origin access control is implemented at Traefik, firewall, or
  middleware level.
- CloudFront custom-origin HTTPS requires a valid certificate that matches the
  origin hostname used by CloudFront.

## References

- Dokploy API: `https://docs.dokploy.com/docs/api`
- Dokploy Docker Compose API: `https://docs.dokploy.com/docs/api/compose`
- Dokploy Domain API: `https://docs.dokploy.com/docs/api/domain`
- AWS CloudFront custom origin HTTPS:
  `https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-cloudfront-to-custom-origin.html`
