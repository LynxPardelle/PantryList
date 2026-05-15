# Codex Agent Memory

## Repository Memory Rules

- Keep `Codex.md` for durable agent memory: preferences, project conventions, and decisions future agents should remember.
- Keep changelog or progress-style notes in `changelog/`, not in `Codex.md`.
- Keep research writeups in `docs/research/`. Naming and branding research belongs in `docs/research/naming/`.
- Keep competitor and future-feature research in `docs/research/features/`.
- Keep monetization research in `docs/research/monetization/`.

## Current Project Direction

- Spanish naming exploration is active. The current leading candidate is `DespensaLista`, but it is not a final launch decision.
- Before public launch or domain purchase, verify domain availability in a registrar and run a formal trademark search.
- Product adaptation for a Latin American audience is active research. Treat feature ideas in `docs/research/features/` as backlog candidates, not approved implementation scope.
- Monetization exploration is active research. Treat ideas in `docs/research/monetization/` as business hypotheses, not pricing decisions.
- The initial `LatAm Shopping Value + Trust Foundation` package has been implemented: local LatAm units and shopping metadata, budgeted shopping estimates, WhatsApp-friendly export, backend/API persistence, SSR/API hardening, dependency audit cleanup, and CI security checks. Real billing, AI, household sharing, price comparison, and delivery integrations remain out of scope.
- The post-implementation audit pass hardened totals and rate limiting: shopping exports now distinguish full totals, partial totals, and missing prices; optional shopping metadata rejects `null`; SSR/backend rate-limit proxy trust is explicit through env/compose; backend CI uses `lint:check`.
- PR deploys are gated through `main`: the `deploy` job in `.github/workflows/ci-cd.yml` skips pull-request runs and runs after merge to `main`. Runtime Docker images intentionally remove global `npm/npx` because Trivy flagged the base image npm dependency tree; the apps run with `node` directly in production.
