# Observability Baseline

Date: 2026-06-09 CT

## Protected Metrics Endpoint

- Path: `GET /api/metrics`
- Access: disabled with `404` until `METRICS_ACCESS_TOKEN` is configured.
- Header options:
  - `X-Metrics-Token: <token>`
  - `Authorization: Bearer <token>`
- Scope: in-memory process metrics only. Values reset when the backend process restarts.

The snapshot includes request counts, error counts, slow-request counts, average/max duration, status-code counts, route-level aggregates, and threshold alerts. It does not include user IDs, emails, pantry item names, shopping notes, tokens, cookies, request bodies, or query-string values.

## Configuration

- `METRICS_ACCESS_TOKEN`: enables the endpoint and protects it.
- `METRICS_SLOW_REQUEST_THRESHOLD_MS`: default `1000`.
- `METRICS_ERROR_RATE_ALERT_THRESHOLD`: default `0.05`.
- `METRICS_MAX_ROUTES`: default `50`.

## Current Limitations

- No external alert destination is wired yet.
- No durable metrics backend is configured yet.
- Route snapshots are process-local and restart-local.
- The next observability step should connect these signals to the chosen production monitoring stack.
