# Phase 6 — Security, RBAC & Tenant Isolation

Phase 6 delivered the security surface that every later phase depends on: JWT lifecycle, dynamic RBAC, tenant isolation beyond RLS, worker hardening, secrets and supply chain, and the DSP administration path.

## Dynamic RBAC (GAP-015)

The static scope model was superseded mid-phase by GAP-015 (`Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan_Supplement.md`). The migration ran as `RBAC-M01` … `RBAC-M12`. The result is eight tables under `packages/db/migrations/004_rbac.sql`: `permissions`, `roles`, `role_permissions`, `user_roles`, `user_permissions`, `groups`, `group_members`, `group_permissions`. All are tenant-scoped with RLS. Permissions are the atomic unit; roles are templates; users receive direct grants, denials, and group memberships. Every row supports `expires_at` and `revoked_at`.

`RBAC-M05` implements the effective-permissions evaluator in `packages/access/src/rbac/effective.ts`: union of role, direct, and group grants, filtered by `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())`, with direct `deny` taking precedence (AWS IAM style). `RBAC-M06` caches the result in Redis (60 s TTL) and invalidates via PostgreSQL `LISTEN/NOTIFY`.

`RBAC-M10` drops `scopes[]` and `tier` from the access token. Tokens are now identity-only (`sub`, `tenant_id`, `jti`, `iat`, `exp`). The interceptor (`packages/gateway/src/interceptor.ts`) reads effective permissions per request. `RBAC-M12` regenerates the Cucumber authorization matrix from the dynamic catalog; it is the `features/authz.feature` suite that runs at phase close.

## JWT lifecycle and revocation

`packages/access/src/token/issue.ts` issues 15-minute access tokens and 7-day refresh tokens. `token/refresh.ts` rotates the refresh family and revokes the family on reuse. `token/denylist.ts` writes revoked `jti` and family ids to Redis with TTL to natural expiry. `token/revoke-user.ts` performs a single indexed lookup to revoke every active family for a user globally.

## Tenant isolation beyond RLS

`P06-T04-S01-M01` mounts only the routes in `packages/gateway/src/route-table.ts`; `/ddex`, `/rights`, `/dsr` and `/stream` return HTTP 404 (not 403 — existence is not disclosed). `P06-T04-S02-M01` gives every tenant a dedicated worker pool with a bulkhead. `P06-T04-S02-M02` implements per-tenant DEK envelope encryption in `packages/access/src/crypto/dek.ts`. `P06-T04-S02-M03` runs the 90-day KEK rotation. `P06-T04-S02-M04` wraps Redis, storage and Kafka in `packages/db/src/namespaced-clients.ts` so `otomix:`, `otomix/` and `otomix.*` are enforced.

## Browser and worker hardening

`P06-T05-S01-M01` emits strict CSP headers in `packages/gateway/src/csp.ts` with explicit `script-src` / `worker-src` allow-lists. `P06-T05-S01-M02` caps WASM memory at 512 MB (`packages/workers/src/wasm-memory.ts`). `P06-T05-S01-M03` proves the analysis workers run unprivileged in `e2e/worker-isolation.spec.ts` (no DOM, no credentials, no network beyond the message channel).

## Secrets, supply chain, and DSP admin

`P06-T06-S01-M01` binds Kubernetes Secrets to HashiCorp Vault via `ExternalSecret` and enforces it with `policy/secrets.rego`. `P06-T06-S01-M02` wires Snyk into CI. `P06-T06-S01-M03` hardens pods and default-denies NetworkPolicies.

`P06-T07-S01-M01` implements `PATCH /api/v1/dsp/parameters` with strict validation (`chopGrid ∈ {1/8,1/16,1/32}`, numeric `crossfadeBeats`). `P06-T07-S01-M02` writes a 7-year-retained `admin_audit` row per change. `P06-T07-S01-M03` propagates parameter updates via the outbox with a per-tenant monotonic sequence.

P06 is complete (committed `fc75cca`); the test matrix includes P06-IT (6 scenarios) and X-P05-P06 … X-P06-P11 (16 cross-phase tests).