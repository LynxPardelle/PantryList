# Findings & Decisions

## Requirements
- Use PantryList as the first real project to exercise the newly installed skills.
- Review the existing codebase and determine how AWS can be added to the stack
  in a way that fits the current implementation.
- Use whatever skills, agents, subagents, MCPs, and plugins are needed to
  complete the project.
- Avoid guessing; base findings on repository files, commands, and later
  verification.

## Research Findings
- The repository contains distinct `frontend/` and `backend/` applications plus
  `docker-compose.yml`, `planning/`, `validations/`, and
  `.github/workflows/ci-cd.yml`.
- The README describes Angular frontend, NestJS backend, MongoDB, Docker, and
  hexagonal backend architecture.
- `instructions.md` asks for Angular frontend, NestJS + Fastify backend,
  MongoDB, tests, security basics, Docker, CI/CD, PWA, and advanced items
  including observability and cloud-oriented capabilities.
- The project started as an incomplete MVP scaffold and has now been evolved
  into a working local application with a grouped pantry model.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Treat AWS integration as an adaptation problem, not an excuse for a rewrite | The user said the project predates AWS knowledge and wants it added to the stack somehow |
| Use `ProductType` + `InventoryLot` instead of extending the flat `Product` model | Multiple caducidades under the same base type are the core new requirement |
| Keep `/api/products` only as a temporary compatibility path | The approved long-term source of truth is the lot-based model |
| Keep AI suggestions out of this phase | The user preferred deterministic behavior first and possible AI features later |
| Seed legacy account claims with insertion-only semantics | The current migration spec requires one claim per distinct legacy owner string without resetting records already in `claiming` or `claimed` |
| Model durability/depletion rules on `ProductType`, not `InventoryLot` | Durability applies to the base product type. Lots participate only when their product type has an active rule, while manual removals remain lot-specific quantity adjustments |
| Derive the first shopping plan from depletion forecasts | A deterministic replenishment schedule is the smallest useful next step after durability and avoids adding AI or cloud infrastructure before the local product loop is stronger |
| Replace PantryList local authentication with Cognito before production | The user approved using Cognito as the authentication authority now, so Google/Facebook and account recovery can be handled by a managed identity provider instead of local password flows |
| Keep `users` as a local app profile/ownership record after Cognito | Pantry ownership, app-level disabled status, and profile display still need a local boundary; the verified Cognito `sub` should become `User.id` |

## Visual/Browser Findings
- Playwright-based browser smoke testing validated the grouped pantry flow and
  saved evidence to
  `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-expiration-smoke.png`.
- `agent-browser` was exercised as a skill candidate, but its local session in
  this machine did not produce a reliable smoke-test path. Observed exact
  evidence before fallback:
  - `get url` returned `chrome-error://chromewebdata/`
  - `get title` returned `127.0.0.1`
  - `agent-browser doctor --offline --quick --json` timed out

## Current-State Findings
- PantryList now uses `ProductType` + `InventoryLot` as the active model for
  the new pantry flow.
- The grouped pantry overview is served from the backend and consumed directly
  by Angular instead of being reconstructed entirely in the client.
- Expiring inventory visibility now supports custom windows in the API: local
  verification showed `days=7` returning `2` lots and `days=30` returning `3`
  lots for the same grouped test item after registering a stable lot that
  expires in 20 days.
- The frontend now prevents overlapping consume requests, resets the unit when
  switching from an existing type to a new type, and labels the existing-type
  search input explicitly.
- The older query/body `userId` ownership checks were superseded by the current
  auth-backed controllers, which derive identity from the access token.
- The product-type save path now upserts by `(userId, normalizedBaseName)` in
  the normal application path, which reduces duplicate creation races even
  though the Mongo index is still non-unique for migration compatibility.
- `backend/scripts/seed-legacy-account-claims.ts` now scans `products`,
  `product_types`, and `inventory_lots`, filters out non-blank ownership values
  already present in `users.id`, and seeds `legacy_account_claims` with
  `$setOnInsert` so reruns do not reset existing claim state.
- `ClaimImportedAccountUseCase` now resumes a partially completed `claiming`
  record when the target user already exists and the stored password credential
  verifies, then retries pantry ownership reassignment before marking the claim
  as `claimed`.
- Durability/depletion forecasting is specified in
  `docs/superpowers/specs/2026-04-24-durability-depletion-design.md` and uses
  product-type-level rules, dynamic read-time estimates, and lot-level manual
  adjustments.
- The implemented durability feature stores `defaultDepletionRule` on
  `ProductType`, exposes `depletingItems` from pantry overview, and leaves
  manual lot consumption as the only quantity mutation path.
- Pantry overview now exposes `shoppingPlanItems` for product types with active
  durability rules. Each item recommends buying one consumption interval three
  days before `estimatedDepletionAt`, clamped to the current date when already
  due.
- The existing Docker MongoDB volume can be recovered from credential drift
  without deleting pantry data by stopping the normal MongoDB service, mounting
  the named volume in a temporary no-port repair container, updating the root
  and app users, and restarting the authenticated Compose stack. The repeatable
  repo entrypoint is `docker/mongodb/Repair-DockerMongoCredentials.ps1`.
- Docker dev commands are cleaner when dependency installation remains in the
  shell wrapper but the long-running Nest/Angular watcher is launched with
  `exec` against the local binary instead of via `npm`.
- Docker development now publishes PantryList on high, configurable localhost
  ports to avoid collisions with other projects: MongoDB `37917`, backend
  `39173`, and frontend `48673`. Internal container ports remain unchanged.
- High-port browser smoke verified a fictitious local PantryList account,
  durable detergent lot creation, manual lot consumption from `3 lt` to `2 lt`,
  shopping-plan recalculation from July to June, logout/login persistence, and
  an empty browser console warning/error list.
- Browser smoke verification over Docker created `Detergente smoke 411900` with
  `4 lt`, estimated `1 lt` current stock after three completed monthly
  intervals, then manual consumption reduced registered stock to `3 lt` and
  dynamic estimated stock to `0 lt`.
- The pantry UI now lets users edit product-type durability rules inline from
  the expanded grouped pantry view. The rule remains product-type-level, not
  lot-level, and manual quantity removal still happens on specific lots.
- Existing-type lot registration now shows `Selecciona un tipo base` for the
  unit preview until a real existing type is selected, avoiding the misleading
  previous fallback to `piezas`.
- Playwright E2E coverage now exercises the main durable-pantry loop against
  `http://localhost:48673` using system Chrome by default: register, create
  durable lot, consume manually, edit durability rule, verify shopping plan,
  logout, and login persistence.
- The Angular `NG0506` development warning was caused by hydration running in
  the Docker `ng serve` workflow. Development now disables hydration, while the
  production environment replacement keeps hydration enabled and NgRx DevTools
  disabled.
- Production-like Docker is now validated separately from the development
  stack. The current local smoke topology uses frontend `48675`, backend
  internal port `3000`, and MongoDB internal port `27017`.
- Production Compose should pass Mongo connection pieces rather than a
  hand-built `DATABASE_URL` when credentials are generated. This avoids invalid
  URIs when passwords include URL-reserved characters.
- The frontend SSR server is the public production entrypoint. It proxies
  `/api` to `BACKEND_URL` and now preserves multiple backend `Set-Cookie`
  headers, which is required for PantryList auth cookies.
- Docker runtime images now use `node:22-alpine`, matching the newer Node line
  used on this machine more closely than the prior Node 20 image.
- Cognito auth replacement is specified in
  `docs/superpowers/specs/2026-04-27-cognito-auth-replacement-design.md`.
  The design removes local password registration, local password reset, local
  JWT issuance, and local refresh sessions from the active auth path, while
  keeping local `users` for app profile and pantry ownership.
- Official AWS Cognito docs verified during the design step:
  - Hosted UI/social IdP support for providers like Facebook and Google.
  - Authorization endpoint support for `state`, provider routing, `nonce`, and
    PKCE parameters.
  - Token endpoint support for authorization-code and refresh-token grants.
  - PKCE support for authorization-code grants.
- Cognito auth replacement is now implemented in the active application path.
  Backend active auth routes are `GET /api/auth/cognito/login`,
  `GET /api/auth/cognito/callback`, `GET /api/auth/me`,
  `POST /api/auth/refresh`, and `POST /api/auth/logout`.
- The backend active dependency graph no longer wires local password
  registration, local login, local password reset, local JWT session issuance,
  refresh-session persistence, password hashing, or logger-based reset email
  delivery.
- `aws-jwt-verify` is now the backend token verification dependency. The
  verifier parses the Cognito User Pool id from `COGNITO_ISSUER` and verifies
  access and ID tokens separately.
- Cognito callback handling stores short-lived HttpOnly transaction cookies for
  state, nonce, PKCE verifier, and safe relative redirect target; callback
  handling validates `state` before exchange and `nonce` after ID-token
  verification.
- Cognito profile sync requires a verified email claim, uses Cognito `sub` as
  local `User.id`, preserves disabled local app users, and suffixes usernames
  with a stable `sub` prefix when a preferred username collides.
- The Angular login page now launches Cognito Hosted UI provider redirects for
  Google, Facebook, or Cognito-hosted email. Active `register`,
  `forgot-password`, `reset-password`, and `claim-imported-account` routes
  redirect to `/login`.
- Local Docker keeps `COGNITO_ENABLED=false` by default. In that mode,
  `GET /api/auth/cognito/login?provider=Google` returns `503` by design, and a
  stale local JWT access cookie on `/api/auth/me` now returns `401` instead of
  surfacing a server error.
- The current Playwright E2E smoke verifies the Cognito login launcher with a
  stubbed Hosted UI redirect. Full Google/Facebook sign-in cannot be verified
  until real AWS Cognito environment values and provider secrets exist.
- The Cognito cleanup removed inactive local password/JWT auth source from the
  active codebase: local password registration/login/reset use cases,
  local refresh-session issuance, password/JWT/token ports, local auth Mongo
  DAOs and schemas, password/JWT infrastructure adapters, frontend local auth
  screens, local auth NgRx actions/state/selectors, and unused `@nestjs/jwt` /
  `argon2` backend dependencies.
- Cookie duration configuration now uses `AUTH_ACCESS_COOKIE_TTL_SECONDS` and
  `AUTH_REFRESH_COOKIE_TTL_SECONDS` instead of JWT-named variables. Cognito
  token validity remains controlled by Cognito; these values only control
  PantryList cookie max age.
- `infra/cognito` now contains a CDK app that synthesizes a Cognito User Pool,
  Managed Login v2 prefix domain, OAuth app client, local callback/logout URLs,
  optional Dokploy callback/logout URLs, and optional Google/Facebook social
  IdPs.
- The CDK stack references Google/Facebook provider secrets by AWS Secrets
  Manager secret name. The synthesized template uses dynamic references such as
  `{{resolve:secretsmanager:/pantrylist/dev/google-client-secret:SecretString:::}}`
  instead of storing secret values in git.
- The social provider redirect URI that must be configured in Google/Facebook
  is the Cognito domain plus `/oauth2/idpresponse`. The PantryList app callback
  remains `/api/auth/cognito/callback`; these URLs are intentionally different.
- CDK deployment has now been run in `us-east-1`. The stack began as a
  Cognito-only deployment and was later updated with Google and Facebook IdPs
  after provider secrets existed in Secrets Manager.

## Skill Evaluation Findings
- `create-implementation-plan` was useful and produced a concrete execution
  artifact at `plan/feature-expiration-lots-1.md` and later
  `plan/feature-durability-depletion-1.md`.
- `frontend-skill` was useful as direction-setting guidance for the grouped UI
  and helped avoid collapsing the screen back into a generic CRUD card grid.
- `audit` was usable only partially in this session. Its `SKILL.md` requires
  `/impeccable`, but that skill was not available in the current tool context,
  so the audit was executed manually using its measurable criteria and explicit
  verification commands.
- `agent-browser` is not yet a reliable local QA path on this machine for this
  project.
- `code-reviewer` is currently misconfigured locally. Exact error observed:
  `config profile 'code-reviewer' not found`.
- `browser-use:browser` worked for final in-app verification after Docker
  frontend restart. It confirmed the pantry page loaded, the neutral unit
  preview appeared, and no fresh browser warnings/errors were logged after the
  hydration window.
- `senior-devops` was useful for clarifying the production-like shape:
  build/test/package/deploy/verify, internal services, healthchecks, required
  secrets, and rollback-friendly separation from the development stack.
- `security-compliance` was useful for keeping the Cognito implementation
  centered on trust boundaries: browser to API, API to Cognito, Cognito token
  verification, HttpOnly token cookies, XSRF for mutating requests, and
  external provider secret handling.
- `comprehensive-review` was applied as a local artifact only. No GitHub issue
  comment was posted because this task is not currently attached to a GitHub
  issue and the skill requires a dry run plus explicit confirmation before
  writing comments.
- The Cognito cleanup review is recorded locally in
  `docs/reviews/2026-04-27-cognito-auth-cleanup-review.md`.
- Official AWS docs used for Cognito infrastructure design:
  - AWS CDK Cognito OAuth app client support for authorization-code flow,
    callback URLs, logout URLs, and scopes.
  - AWS CloudFormation `AWS::Cognito::UserPoolIdentityProvider` provider
    details for Google and Facebook.
  - AWS Cognito prefix domains and Managed Login versioning.
  - AWS Cognito social IdP guidance for `/oauth2/idpresponse`.
- AWS CLI is configured for the target account and default region `us-east-1`;
  the CDK stack now exists there and outputs a User Pool, app client, Managed
  Login domain, local callback URL, social provider `/oauth2/idpresponse` URL,
  and `AllowedProviders=COGNITO,Google,Facebook`.
- `gcloud` was not available in this terminal, and Meta provider credentials
  require the user's authenticated Meta Developer console. Do not fabricate or
  guess Google/Facebook client IDs or secrets.
- Official provider docs used for the social-credential guide:
  - Google OAuth 2.0 web applications require registered redirect URIs that
    exactly match the configured OAuth client.
  - AWS Cognito social IdP setup requires Google/Facebook to redirect to the
    Cognito domain's `/oauth2/idpresponse` endpoint.
  - Meta app setup and Facebook Login configuration are managed through the
    Meta for Developers app dashboard.
- Google/Facebook provider secrets were written to AWS Secrets Manager under
  `/pantrylist/dev/...` names. Secret values were not committed to git and were
  not retrieved back for verification.

## Security Concerns To Keep Visible
- The main pantry, lot, product-type, and legacy product HTTP controllers now
  use `AccessTokenGuard` and `@CurrentUser()` instead of trusting frontend
  `userId` parameters.
- Historical note: before auth-backed controllers, the 2026-04-22 audit hardened
  blank `userId` inputs to return `400` instead of surfacing server errors. The
  current path now uses PantryList JWT accounts rather than client-supplied
  identity parameters.
- The legacy-claim seeding script excludes only owner strings already present
  in `users.id` because the current schema does not expose a stronger legacy
  marker. If orphaned pantry rows exist with stale `user.id` values but no
  matching `users` document, the script will still surface them as claim
  candidates and they should be reviewed before running with `--apply`.
- Password-reset email delivery is still a development logger, not a production
  email provider.
- Frontend production dependencies currently audit clean with
  `npm audit --omit=dev`. The full frontend audit still reports 11
  development-tooling findings through Angular CLI/build dependencies; the only
  automatic fix path offered by npm requires a breaking `@angular/cli@21.2.8`
  migration and was intentionally not applied in this feature pass.
- Backend production dependencies also audit clean with
  `npm audit --omit=dev`. Docker build output pruned dev dependencies in the
  runtime image and reported `found 0 vulnerabilities` for runtime dependency
  trees.
- For local HTTP-only production smoke tests, `AUTH_COOKIE_SECURE=false` is
  required. Dokploy/HTTPS deployments should keep `AUTH_COOKIE_SECURE=true`.
- Cognito replacement introduces external identity/provider configuration risk.
  Provider secrets, Cognito client secrets, and callback/logout URLs must stay
  out of git and be validated through deployment environment settings.
- Do not keep a local-password fallback once Cognito is enabled; two
  authentication authorities would make account recovery, session revocation,
  and social-provider linking harder to reason about.
- Local password fallback code has now been removed from active source. Future
  imported-account recovery should be redesigned around verified Cognito users
  instead of restoring local password claims.
- Real Cognito deployment must use least-privilege environment handling:
  provider secrets and optional Cognito client secret should be set only in the
  deployment environment, never in tracked `.env` examples or docs.
- Cognito Hosted UI callback/logout URLs must exactly match the deployed
  domain. Mismatched local, Dokploy, and Cognito console settings will fail
  login even if the PantryList code is correct.
- Local Docker is now configured outside git to use the deployed Cognito stack
  with `COGNITO`, `Google`, and `Facebook` allowed.
- The Angular login screen now reads `/api/auth/cognito/providers`, so provider
  buttons follow runtime configuration instead of hardcoding Google/Facebook
  before those IdPs exist in Cognito.
- Provider secrets should be entered through AWS Console or the
  `infra/cognito/scripts/Set-SocialProviderSecrets.ps1` helper so values are
  not stored in shell history, source files, or tracked CDK context.
- Because provider secrets were pasted into the conversation for setup, rotate
  the Google and Facebook client secrets after the first successful login smoke,
  then update Secrets Manager and redeploy the CDK stack.
- Production dependency audits for backend and frontend pass with
  `npm audit --omit=dev`. Development watcher containers still install dev
  dependencies and can report dev-tooling audit findings that are not present
  in runtime dependency trees.
- Cognito Managed Login v2 requires a Managed Login branding style on the app
  client. The CDK stack now creates `AWS::Cognito::ManagedLoginBranding` with
  Cognito-provided defaults so hosted login pages render instead of returning
  `Login pages unavailable`.
- Google social login now reaches the Google sign-in page after authorizing
  Cognito's social provider redirect URI in Google OAuth. Full account callback
  still needs one credential-backed smoke test after secrets are rotated.
- The frontend is now on Angular `21.2.10` and CLI `21.2.8`. Production
  dependency audit remains clean, but full dev audit still reports moderate
  dev-tooling findings in Angular build/dev-server paths without a complete
  non-breaking `npm audit fix` path.
- PantryList users now maintain `authSubjectIds` so one app profile can be
  linked to multiple verified Cognito identities. This avoids duplicate-email
  callback crashes and is a better base for Google/Facebook/Cognito account
  linking than using the Cognito `sub` as the only user lookup key.
- Account linking by email should remain restricted to verified Cognito email
  claims. If a provider does not send `email_verified=true`, the app should not
  silently attach that login to an existing PantryList account.
- PantryList's design direction is now documented as `Hogar operativo`: warm
  household clarity plus operational controls, while explicitly avoiding
  corporate SaaS density, childlike styling, and alarm-heavy medical UX.
- The profile/preferences feature should add real behavior-backed settings only:
  expiration warning days, expired entry alert toggle, depletion warning ratio,
  and shopping-plan lead days.
- Browser date inputs serialize expiration dates as date-only UTC-midnight
  values, so expiration comparison must also use date-only UTC boundaries. A
  local Central Time comparison can mark today's date as already expired.
- Profile preferences are stored on the user document through
  `UserPreferencesDao`, keeping the app ready for a future MongoDB-to-other-DB
  persistence swap without changing controllers or Angular screens.
- The `/profile` Angular route should stay lazy-loaded. Keeping profile
  settings out of the initial pantry bundle brought the initial production build
  back under budget.
- Expired lots should be included in the priority groups, but the entry alert
  should remain non-modal and dismissible for the current visit. Blocking the
  pantry on every login would make the warning punitive instead of useful.
- `.env.docker.local` remains ignored and must stay uncommitted. It can contain
  local MongoDB and Cognito runtime values.
- The `security-compliance` secret scanner returned `count = 0` and
  `findings = []` for the PantryList workspace after this feature pass.
- Frontend and backend production dependency audits returned zero production
  vulnerabilities. Docker development containers can still report dev-tooling
  audit noise because they install watcher/test dependencies.
- Facebook/Cognito login can legitimately take longer than 5 minutes when the
  provider asks for consent, MFA, or account checks. The OAuth `state`, nonce,
  and PKCE verifier cookies should stay short-lived but 900 seconds is a safer
  local default than 300 seconds.
- `Invalid Cognito auth state` should not be bypassed. It is the correct CSRF
  defense. The safe recovery path is to clear stale transaction cookies and
  redirect the user to `/login?authError=cognito_state` so they can start a
  fresh provider flow.
- `expiringSoonQuantity` is useful as a compatibility total, but it is not a
  user-facing "por caducar" count because expired lots also satisfy the
  review-worthy expiration window. UI summaries should derive "Ya caducó" from
  `expirationStatus === 'expired'` and "Por caducar" from `critical/soon`.
- Pantry date fields are date-only values from browser date inputs. Rendering
  UTC-midnight API values in the local timezone can shift the visible date to
  the previous Central Time day, so pantry calendar date displays should use
  UTC formatting unless the backend changes to a pure date string contract.
- Current depletion forecasting is product-type-rule anchored. It calculates
  elapsed intervals from `ProductType.defaultDepletionRule.anchorDate`, not
  from each lot's `purchaseDate`. This explains why a lot bought a month ago
  can still show the original quantity if the depletion rule anchor is today.
- The current read model builds pantry groups by iterating active inventory
  lots. When the final quantity of a durable product is consumed, the lot is
  deleted and the product type no longer appears in `items` or
  `shoppingPlanItems`, even if its durable rule says the user should restock.
- `PantryLotSummary` does not expose `purchaseDate`, although
  `InventoryLot` and `ApiInventoryLot` already have it. The UI therefore
  cannot show when the object was bought from the grouped pantry view.
- Profile preferences currently act globally only. The existing product-type
  depletion rule already gives a natural place to add per-type operational
  overrides before considering per-lot overrides.
- Existing shopping-plan urgency labels are technically correct but user copy
  is not household-obvious enough. The next pass should prefer action language
  such as "Comprar ya", "Comprar esta semana", and "Comprar pronto" over
  abstract system states.

## Resources
- `C:\Users\lince\Documents\GitHub\PantryList\.impeccable.md`
- `C:\Users\lince\Documents\GitHub\PantryList\README.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\superpowers\specs\2026-04-21-expiration-lot-model-design.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\superpowers\specs\2026-04-24-durability-depletion-design.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\superpowers\specs\2026-04-27-cognito-auth-replacement-design.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\superpowers\specs\2026-04-28-profile-preferences-expired-alerts-design.md`
- `C:\Users\lince\Documents\GitHub\PantryList\plan\feature-expiration-lots-1.md`
- `C:\Users\lince\Documents\GitHub\PantryList\plan\feature-durability-depletion-1.md`
- `C:\Users\lince\Documents\GitHub\PantryList\plan\feature-shopping-plan-1.md`
- `C:\Users\lince\Documents\GitHub\PantryList\plan\feature-cognito-auth-replacement-1.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\reviews\2026-04-27-cognito-auth-comprehensive-review.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\reviews\2026-04-27-cognito-auth-cleanup-review.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\deployment\cognito.md`
- `C:\Users\lince\Documents\GitHub\PantryList\infra\cognito\README.md`
- `C:\Users\lince\Documents\GitHub\PantryList\infra\cognito\scripts\Set-SocialProviderSecrets.ps1`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\reviews\2026-04-27-cognito-aws-infra-review.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\reviews\2026-04-27-cognito-social-smoke-audit.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\reviews\2026-04-27-angular-21-migration-review.md`
- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-expiration-smoke.png`
- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-durability-smoke.png`
- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-smoke.png`
