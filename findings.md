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
- The backend now rejects `GET /api/product-types/:id` without `userId` and
  returns `404` for a different user's `userId`, but the broader username-only
  trust model remains a real security limitation until proper authentication is
  introduced.
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

## Skill Evaluation Findings
- `create-implementation-plan` was useful and produced a concrete execution
  artifact at `plan/feature-expiration-lots-1.md`.
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

## Security Concerns To Keep Visible
- The app still trusts a client-supplied `userId` as its working identity.
  That is acceptable for this MVP, but it is not sufficient for a real
  multi-user deployment.
- After the 2026-04-22 triple audit, missing or blank `userId` now returns
  `400` on the audited read endpoints instead of surfacing a server error, but
  that does not change the underlying lack of real authentication.
- The legacy-claim seeding script excludes only owner strings already present
  in `users.id` because the current schema does not expose a stronger legacy
  marker. If orphaned pantry rows exist with stale `user.id` values but no
  matching `users` document, the script will still surface them as claim
  candidates and they should be reviewed before running with `--apply`.

## Resources
- `C:\Users\lince\Documents\GitHub\PantryList\README.md`
- `C:\Users\lince\Documents\GitHub\PantryList\docs\superpowers\specs\2026-04-21-expiration-lot-model-design.md`
- `C:\Users\lince\Documents\GitHub\PantryList\plan\feature-expiration-lots-1.md`
- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-expiration-smoke.png`
- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-smoke.png`
