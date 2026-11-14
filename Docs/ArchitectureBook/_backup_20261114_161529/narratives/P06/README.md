# Phase 6 - Security, RBAC & Tenant Isolation

**Status:** 32/32 complete, 6 superseded by GAP-015.

Phase 6 delivered the full security surface: JWT lifecycle with rotation and Redis deny-list, dynamic RBAC (GAP-015) with a permissions catalog, roles, direct grants, groups, and an effective-permissions evaluator, tenant isolation beyond RLS (route non-exposure, per-tenant worker pool bulkheads, DEK envelope encryption, 90-day KEK rotation, namespaced clients), browser/worker hardening (strict CSP, 512 MB WASM cap, isolation probe), Vault + Snyk + pod hardening, and DSP parameter administration with 7-year audit and outbox propagation. P06 is complete.

## What was delivered

- **P06-T01-S01-M01** - Issue access tokens (15 minutes) carrying sub, tenant_id, scopes[], tier, jti, exp.
- **P06-T01-S01-M02** - Issue refresh tokens (7 days) with rotation: each use returns a new token and invalidates the previous; reuse of an invalidated token revokes the whole family.
- **P06-T01-S02-M01** - Write revoked jti/family ids to a Redis deny-list (TTL to natural expiry) and check it in the gateway interceptor on every request.
- **P06-T01-S02-M02** - On role revocation, revoke every active session/family for the user globally.
- **P06-T02-S01-M01** - Create the route scope registry declaring explicit required scopes per endpoint (no catch-all *) and a static test failing on any route without one.
- **P06-T02-S02-M01** - Fire a Slack webhook payload on any role escalation or emergency scope grant.
- **P06-T04-S01-M01** - Ensure /ddex, /rights, /dsr and stream-license routes are not mounted and return HTTP 404.
- **P06-T04-S02-M01** - Create a dedicated per-tenant worker pool with a bulkhead that prevents another tenant's pool from being drained.
- **P06-T04-S02-M02** - Implement per-tenant data-encryption keys (envelope encryption) for audio storage.
- **P06-T04-S02-M03** - Implement the 90-day key rotation job that re-wraps DEKs and keeps old ciphertext readable.
- **P06-T04-S02-M04** - Enforce the otomix: Redis prefix, otomix/ storage prefix and otomix.* topic names through wrapper clients.
- **P06-T05-S01-M01** - Emit CSP headers with strict script-src and worker-src allow-lists plus object-src 'none', base-uri 'none', frame-ancestors 'none'.
- **P06-T05-S01-M02** - Create WASM memory with a hard maximum of 512 MB (8 192 pages of 64 KiB) for analysis workers.
- **P06-T05-S01-M03** - Verify analysis workers run unprivileged: no DOM, no credentials and no network beyond the message channel.
- **P06-T06-S01-M01** - Back Kubernetes Secrets with HashiCorp Vault (ExternalSecret references only; no plaintext data in manifests).
- **P06-T06-S01-M02** - Run Snyk dependency scanning on every build and block on findings per the CVSS gate.
- **P06-T06-S01-M03** - Harden pods: non-root, read-only root filesystem, dropped capabilities and default-deny NetworkPolicies.
- **P06-T07-S01-M01** - Implement PATCH /api/v1/dsp/parameters validating chopGrid ∈ {1/8,1/16,1/32} and numeric crossfadeBeats.
- **P06-T07-S01-M02** - Write a 7-year-retained admin audit record for every parameter change.
- **P06-T07-S01-M03** - Propagate parameter updates via the outbox as signed messages with a per-tenant monotonic sequence.
- **P06-RBAC-M01** - Migration: 8 RBAC tables (permissions, roles, role_permissions, user_roles, user_permissions, groups, group_members, group_permissions) + RLS + indexes + audit. GAP-015.
- **P06-RBAC-M02** - Permissions catalog seed (>=40 keys) + drift detector. GAP-015.
- **P06-RBAC-M03** - Seed base roles (regular_user, tier_N, dsp_specialist, content_specialist, customer_care, accountant, deputy_admin, super_admin). GAP-015.
- **P06-RBAC-M04** - Grant/revoke service with audit + Slack escalation. GAP-015.
- **P06-RBAC-M05** - Effective permissions evaluator (union of role + user + group grants, deny precedence, expiry filter). GAP-015.
- **P06-RBAC-M06** - Redis cache (60s TTL) + PostgreSQL LISTEN/NOTIFY invalidation for effective permissions. GAP-015.
- **P06-RBAC-M07** - Bootstrap super_admin + regular_user. GAP-015.
- **P06-RBAC-M08** - Group CRUD + time-bound group permissions. GAP-015.
- **P06-RBAC-M09** - Expiry test with frozen clock (T-1ms / T / T+1ms). GAP-015.
- **P06-RBAC-M10** - Drop scopes[] and tier from access token; token carries identity only. GAP-015.
- **P06-RBAC-M11** - Rewrite interceptor to read effective permissions per request. GAP-015.
- **P06-RBAC-M12** - Regenerate Cucumber authorization matrix from the dynamic catalog. GAP-015.

## Superseded

- **P06-T02-S01-M02** - SUPERSEDED:GAP-015
- **P06-T02-S01-M03** - SUPERSEDED:GAP-015
- **P06-T02-S02-M02** - SUPERSEDED:GAP-015
- **P06-T02-S03-M01** - SUPERSEDED:GAP-015
- **P06-T03-S01-M01** - SUPERSEDED:GAP-015
- **P06-T03-S01-M02** - SUPERSEDED:GAP-015

