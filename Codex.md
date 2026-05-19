# Codex Agent Memory

## Repository Memory Rules

- Keep `Codex.md` for durable agent memory: preferences, project conventions, and decisions future agents should remember.
- Keep changelog or progress-style notes in `changelog/`, not in `Codex.md`.
- Keep research writeups in `docs/research/`. Naming and branding research belongs in `docs/research/naming/`.
- Keep competitor and future-feature research in `docs/research/features/`.
- Keep monetization research in `docs/research/monetization/`.
- When closing any improvement batch, show the full remaining feature backlog with completed items removed, grouped by source/section, and include a short prioritized recommendation for the next batch.
- Use `caveman` communication style by default for this project unless the user explicitly asks for normal mode.

## Current Project Direction

- Spanish naming exploration is active. The current leading candidate is `DespensaLista`, but it is not a final launch decision.
- Before public launch or domain purchase, verify domain availability in a registrar and run a formal trademark search.
- Product adaptation for a Latin American audience is active research. Treat feature ideas in `docs/research/features/` as backlog candidates, not approved implementation scope.
- Monetization exploration is active research. Treat ideas in `docs/research/monetization/` as business hypotheses, not pricing decisions.
- The initial `LatAm Shopping Value + Trust Foundation` package has been implemented: local LatAm units and shopping metadata, budgeted shopping estimates, WhatsApp-friendly export, backend/API persistence, SSR/API hardening, dependency audit cleanup, and CI security checks. Real billing, AI, household sharing, price comparison, and delivery integrations remain out of scope.
- The post-implementation audit pass hardened totals and rate limiting: shopping exports now distinguish full totals, partial totals, and missing prices; optional shopping metadata rejects `null`; SSR/backend rate-limit proxy trust is explicit through env/compose; backend CI uses `lint:check`.
- The next `Household Basics + Visible Savings` package uses existing product-type shopping metadata and derived pantry overview fields instead of adding an event-history table. It adds household staples, staple attention/restock insights, value summaries, and shopping export grouping by store route. Detailed consumption history, collaboration, AI/receipt capture, payments, and retailer integrations remain deferred.
- Dokploy owns the actual production auto deploy after `main` changes. The GitHub workflow uses a `production-smoke` job after merge to verify `https://pantrylist.lynxpardelle.com/healthz`, `/api/healthz`, and no-cache HTML headers. Runtime Docker images intentionally remove global `npm/npx` because Trivy flagged the base image npm dependency tree; the apps run with `node` directly in production.
- Production authenticated audits should cover stale-session behavior, not only anonymous redirects. Protected frontend services now send credentials explicitly, and lot registration has a timeout so the UI cannot stay on `Registrando lote...` indefinitely when a protected request hangs.
- The next approved improvement direction is a six-block package, in order: privacy controls/data lifecycle, pagination/query limits, observability baseline, shopping mode plus close-purchase flow, offline-capable PWA behavior for shopping, and household sharing lite. The shopping-mode block may include mobile checklist UX, keep-screen-awake support, real paid-price capture, closing purchases into lots, planned-vs-real budget comparison, and robust Web Share/WhatsApp/copy fallback.
- The `Household Savings + PWA Reliability` batch uses derived overview data instead of new product tables: staple catalog groups, waste-at-risk and price coverage summaries, store-route category breakdowns, offline checkout queue, local pantry-data deletion with `ELIMINAR` confirmation, and checkout logs with request IDs. It still does not delete Cognito identities, implement real multi-member households, or add payments/AI/retailer integrations.
