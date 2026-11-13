# OTOMIX — Base deployment (hardened)

## Pod hardening requirements (enforced by `policy/pod-hardening.rego`)

| Requirement | Path |
|-------------|------|
| `runAsNonRoot: true` | pod securityContext |
| `readOnlyRootFilesystem: true` | every container |
| `allowPrivilegeEscalation: false` | every container |
| `capabilities.drop: ["ALL"]` | every container |
| `hostNetwork/hostPID/hostIPC` not true | pod spec |
| Namespace annotated `otomix.networkpolicy: managed` | metadata |

## NetworkPolicy
- `default-deny` (Ingress + Egress) for all pods in `otomix`.
- `allow-ingress-from-ingress` for the gateway from `ingress-nginx`.
- `allow-egress-dns-and-core` for DNS + core command.

## Defense in depth
- PSA `restricted` labels on the namespace.
- OPA policy (`policy/pod-hardening.rego`) is authoritative in this repo.

## Not enforced (documented)
- `runAsUser` non-zero UID. Recommended (we use 1000) but not enforced by OPA.