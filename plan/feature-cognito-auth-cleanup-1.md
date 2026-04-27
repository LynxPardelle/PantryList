---
goal: Remove inactive local authentication remnants after Cognito replacement
version: 1.0
date_created: 2026-04-27
last_updated: 2026-04-27
owner: Codex
status: Completed
tags: [cleanup, auth, cognito, security, angular, nestjs]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This cleanup removes inactive local password/JWT authentication source paths
after Cognito became the active authentication authority. Historical design
documents are preserved, but active source, dependency, and runtime wiring
should no longer expose local auth fallback concepts.

## Requirements

- **REQ-001**: Remove inactive backend local password auth use cases, ports,
  services, DAOs, schemas, entities, and security adapters.
- **REQ-002**: Remove inactive frontend register, forgot password, reset
  password, and claim imported account components/actions/facade methods.
- **REQ-003**: Remove unused local auth dependencies such as `@nestjs/jwt` and
  `argon2` if no active source references remain.
- **REQ-004**: Keep historical specs/docs intact unless they incorrectly
  describe current active behavior.
- **SEC-001**: Do not introduce a local password fallback.
- **SEC-002**: Keep Cognito token cookies and XSRF behavior unchanged.
- **SEC-003**: Verify no likely secrets are introduced.

## Tasks

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Map obsolete backend/frontend local-auth references. | Yes | 2026-04-27 |
| TASK-002 | Delete inactive backend local auth source files and remove stale tokens/schema wiring. | Yes | 2026-04-27 |
| TASK-003 | Delete inactive frontend local auth screens/actions/state/facade remnants. | Yes | 2026-04-27 |
| TASK-004 | Remove unused local auth npm dependencies and update lockfile. | Yes | 2026-04-27 |
| TASK-005 | Update planning, findings, progress, and review notes. | Yes | 2026-04-27 |
| TASK-006 | Run backend/frontend tests, builds, audits, Compose checks, and smoke checks. | Yes | 2026-04-27 |

## Risks

- **RISK-001**: Historical legacy account claim flows will need a Cognito-native
  redesign if old imported pantry ownership must be claimed later.
- **RISK-002**: Removing shared auth state fields can reveal hidden component
  references; verification must catch these.
- **RISK-003**: Dependency lockfile pruning can be noisy; audits must verify
  runtime dependency health after the change.
