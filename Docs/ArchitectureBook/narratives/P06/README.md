# Phase 6 — Security, RBAC & Tenant Isolation

## What P06 Delivers

P06 enforces **zero-trust** at every layer: authentication (JWT), authorization (scopes + tier grants), data isolation (Row-Level Security), and audit logging (to P10).

| Layer | Mechanism |
|-------|-----------|
| **Auth** | RS256 JWT, short TTL (`ACCESS_TTL_MIN = 15` from `constants/scoring.ts`), refresh rotation (`REFRESH_TTL_DAYS = 7`, `KEY_ROTATION_DAYS = 90`). |
| **Scopes** | Fine-grained: `tracks:read`, `tracks:write`, `mixes:create`, `admin:tenants`. Encoded in JWT `scope` claim. |
| **Tier Grants** | `free` / `pro` / `enterprise` — controls feature flags (e.g., MAEST embeddings, export formats, concurrent mixes). |
| **RLS** | PostgreSQL Row-Level Security on every tenant table. Policy: `tenant_id = current_setting('app.current_tenant')::uuid`. Set by middleware on every request. |
| **Audit Log** | Every authorization decision (allow/deny) → structured log with `trace_id`, `user_id`, `tenant_id`, `resource`, `action`, `decision`. Shipped to P10 OpenTelemetry. |

**Input**: User identity (JWT) + request context (tenant, resource, action).
**Output**: Authorized/denied + audit event.

**Blocked Task (1)**:
- OQ-10: Tier grant matrix — which scopes map to which tiers? Requires product decision.

**Total P06 tasks: All TODO, 1 blocked.**