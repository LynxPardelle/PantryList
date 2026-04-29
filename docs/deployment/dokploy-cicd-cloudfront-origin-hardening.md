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

## Execution Results

Completed on 2026-04-29 Central Time.

### Dokploy

- Created Dokploy project: `PantryList`.
- Reused automatically created environment: `production`.
- Created compose service: `pantrylist-production`.
- Compose id: `d1eFduaHWwr_-t-cqE_84`.
- GitHub source:
  - provider id: `BTmVH3U1uN2pFLZL5Ygxu`
  - owner/repository: `LynxPardelle/PantryList`
  - branch: `main`
  - compose path: `docker-compose.dokploy.prod.yml`
  - auto deploy: `true`
- Runtime environment was saved in Dokploy through compose configuration.
- Dokploy detected compose services: `backend`, `frontend`.
- Dokploy domain:
  - host: `origin.pantrylist.lynxpardelle.com`
  - service: `frontend`
  - port: `4000`
  - HTTPS: `true`
  - certificate type: `letsencrypt`

### AWS

- Created Route53 A record:
  `origin.pantrylist.lynxpardelle.com -> 54.198.41.242`.
- Updated CloudFront distribution `E244X3QM2RVQYC`:
  - origin domain: `origin.pantrylist.lynxpardelle.com`
  - origin protocol policy: `https-only`
  - origin HTTPS port: `443`
  - origin request policy: `ALL_VIEWER_EXCEPT_HOST_HEADER`
- Disabled CloudFront IPv6 for `pantrylist.lynxpardelle.com` after local
  validation showed intermittent IPv6 connection resets. Route53 now returns A
  records and no application AAAA alias for this hostname.

### Verification Evidence

- `https://origin.pantrylist.lynxpardelle.com/api/healthz` returned `200`.
- CloudFront distribution status returned `Deployed`.
- CloudFront origin inspection returned:
  - domain: `origin.pantrylist.lynxpardelle.com`
  - protocol policy: `https-only`
  - IPv6 enabled: `false`
- Ten repeated public checks returned `200` for:
  - `https://pantrylist.lynxpardelle.com/api/healthz`
  - `https://pantrylist.lynxpardelle.com/api/auth/cognito/providers`
- `https://pantrylist.lynxpardelle.com/login/` returned `200`.
- Cognito hosted login launch returned `200` with Cognito-managed cookies after
  the backend/provider flow reached the Hosted UI.

## Incident During Rollout

The first HTTPS-origin CloudFront update returned `502` because the distribution
still used `ALL_VIEWER`, which forwarded
`Host: pantrylist.lynxpardelle.com` to the origin. The origin certificate was
issued for `origin.pantrylist.lynxpardelle.com`, so the certificate name and
forwarded host did not match.

Resolution:

- Rolled CloudFront back to the previous HTTP-only EC2 origin.
- Verified production `/healthz` and `/api/healthz` returned `200`.
- Updated CDK to use `ALL_VIEWER_EXCEPT_HOST_HEADER` whenever the origin
  protocol policy is `https-only`.
- Redeployed CloudFront to the HTTPS origin.

## Current Residual Risk

- Direct access to `origin.pantrylist.lynxpardelle.com` is possible. It is now
  encrypted, but it is not yet restricted to CloudFront-only traffic.
- The manual SSM-created compose stack remains available as rollback until the
  Dokploy-managed deployment has been observed through at least one normal
  production release.
- CloudFront IPv6 is disabled for this distribution because local IPv6 checks
  showed intermittent resets. Re-enable only after validating IPv6 from a known
  stable network.

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
