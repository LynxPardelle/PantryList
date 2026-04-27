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
- Production dependency audits for backend and frontend pass with
  `npm audit --omit=dev`. Development watcher containers still install dev
  dependencies and can report dev-tooling audit findings that are not present
  in runtime dependency trees.

## Resources
- `C:\Users\lince\Documents\GitHub\PantryList\README.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\superpowers\specs\2026-04-21-expiration-lot-model-design.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\superpowers\specs\2026-04-24-durability-depletion-design.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\superpowers\specs\2026-04-27-cognito-auth-replacement-design.md`
- `C:\Users\lince\Documents\GitHub\PantryList\plan\feature-expiration-lots-1.md`
- `C:\Users\lince\Documents\GitHub\PantryList\plan\feature-durability-depletion-1.md`
- `C:\Users\lince\Documents\GitHub\PantryList\plan\feature-shopping-plan-1.md`
- `C:\Users\lince\Documents\GitHub\PantryList\plan\feature-cognito-auth-replacement-1.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\reviews\2026-04-27-cognito-auth-comprehensive-review.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\reviews\2026-04-27-cognito-auth-cleanup-review.md`
- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-expiration-smoke.png`
- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-durability-smoke.png`
- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-smoke.png`
