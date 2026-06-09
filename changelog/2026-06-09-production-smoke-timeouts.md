# Production Smoke Timeout Hardening

## Summary

- Added explicit connect and response timeouts to production smoke curl calls.
- Prevents the GitHub production-smoke job from hanging when the Dokploy host accepts TCP but does not return HTTP bytes.

## Incident Notes

- During the Stripe monetization discovery deploy, the Dokploy EC2 host stopped responding on HTTP while accepting TCP.
- EC2 console output showed `OSError: [Errno 28] No space left on device`.
- Root EBS volume `vol-0bd5f763909f1383b` was snapshotted as `snap-0e2ffccfd85932b9f`, expanded from 80 GB to 120 GB, checked with `e2fsck`, resized with `resize2fs`, and cleaned offline through a temporary helper instance.
- Temporary helper instance `i-0d33f07ef8509f918` was terminated.
- Temporary SSH security group rule `sgr-0ddcd029ee29e4d60` was revoked.

## Validation

- `git diff --check`: passed with CRLF warnings only.
- Privacy review gate: no sensitive feature files changed.
- Production `/healthz`: 200.
- Production `/api/healthz`: 200.
- Production `/login/`: 200.
