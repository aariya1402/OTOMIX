# OTOMIX — Secrets (Vault-backed)

All OTOMIX Kubernetes Secrets are backed by **HashiCorp Vault** (KV v2),
injected by the **External Secrets Operator** (ESO). No plaintext
`kind: Secret` manifests are allowed in this directory; the OPA policy
`policy/secrets.rego` enforces this in CI (`.github/workflows/policy-check.yml`).

## Vault path convention

| Logical secret | Vault path | K8s Secret |
|---------------|------------|------------|
| Postgres credentials | `secret/data/otomix/postgres` | `postgres-credentials` |
| JWT signing keys | `secret/data/otomix/jwt-signing-keys` | `jwt-signing-keys` |
| Redis auth | `secret/data/otomix/redis` | `redis-auth` |
| S3 credentials | `secret/data/otomix/s3` | `s3-credentials` |
| App config (extensible) | `secret/data/otomix/app-config` | `otomix-app-config` |

## Prerequisites (platform-provided, out of scope here)

- External Secrets Operator installed.
- `ClusterSecretStore` named `vault-backend` configured for KV v2.
- Vault auth (ServiceAccount + VaultAuth) — provided by the deployment layer.

## Local verification

- Requires `conftest` on PATH: `winget install OPA.conftest` (Windows) or
  `brew install conftest` (macOS).
- `pnpm conftest:test` runs the allow-list (deploy/) and deny-list
  (policy/testdata/) checks. If `conftest` is missing, the script prints a
  warning and skips locally; CI always runs the check.