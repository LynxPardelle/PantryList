# Angular 21 Migration Review - 2026-04-27

## Scope

Upgrade PantryList frontend from Angular 19 to the current Angular 21 stable
line and verify local Docker/runtime behavior.

## Sources Checked

- `npm view @angular/core version` returned `21.2.10`.
- `npm view @angular/cli version` returned `21.2.8`.
- Angular's `ng update` documentation recommends updating by major version and
  using the latest patch version for the target major.
- Angular's release guidance says multi-major upgrades should be performed one
  major version at a time.

## Changes

| Area | Result |
| --- | --- |
| Angular framework | Updated Angular packages to `21.2.10`. |
| Angular CLI/build | Updated CLI and build tooling to `21.2.8`. |
| UI ecosystem | Updated Angular CDK/Material to `21.2.8`, NgRx packages to `21.1.0`, `ngx-bootstrap` to `21.2.0`, and `ngx-bootstrap-expanded-features` to `1.5.0`. |
| TypeScript and Node types | Updated TypeScript to `5.9.3` and `@types/node` to the Node 22 line so Docker `npm ci` is in sync with Angular 21/Vite peer expectations. |
| SSR HTTP client | Replaced `HttpClientModule`/`HttpClientXsrfModule` with `provideHttpClient(withFetch(), withXsrfConfiguration(...))` to satisfy Angular 21 SSR guidance while preserving the existing XSRF cookie/header names. |
| Angular migration output | `ng update` added schematic defaults in `angular.json` and migrated `ngZoneEventCoalescing` to `provideZoneChangeDetection({ eventCoalescing: true })`. |

## Verification

| Check | Result |
| --- | --- |
| Google OAuth smoke | Google now reaches `accounts.google.com/v3/signin/identifier` with Cognito `/oauth2/idpresponse` as `redirect_uri`; no `redirect_uri_mismatch` observed. |
| Angular version | `npx ng version` reports Angular `21.2.10`, CLI `21.2.8`, Node `22.22.2`, npm `11.13.0`. |
| Frontend tests | `npm run test:ci` passed with `18 SUCCESS`. |
| Frontend build | `npm run build` passed and prerendered `7` static routes. |
| Frontend E2E | `npm run test:e2e` passed with `1` Playwright test. |
| Docker image/runtime | `docker compose --env-file .env.docker.local --profile app up -d --build frontend` rebuilt and restarted frontend successfully. |
| Runtime browser smoke | Playwright saw Cognito, Google, and Facebook buttons after hydration and Google reached the Google sign-in page without console errors. |
| Production audit | `npm audit --omit=dev --json` returned `total = 0`. |

## Residual Risk

- Full `npm audit` still reports `6 moderate` dev-tooling findings through
  Angular build/dev-server dependencies (`postcss`, `webpack-dev-server`,
  `sockjs`, and `uuid`). `npm audit fix --dry-run` reported no complete
  non-breaking fix for those dependency paths. Production/runtime pruning in
  Docker reported `found 0 vulnerabilities`.
- Full Google callback was not completed because no provider credentials were
  entered during the smoke test.
