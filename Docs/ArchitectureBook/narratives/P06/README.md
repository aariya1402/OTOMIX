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


## Per-task narratives

### P06-RBAC-M01 - Migration: 8 RBAC tables (permissions, roles, role_permissions, user_roles, user

The task involves migrating a comprehensive set of eight Role-Based Access Control (RBAC) tables—permissions, roles, role_permissions, user_roles, user_permissions, groups, group_members, and group_permissions—along with Row-Level Security (RLS) configurations, associated indexes, and audit trails from legacy systems into the new platform. This migration is critical because the current system lacks consistent access control enforcement, leading to security gaps and inconsistent user permissions across modules. Without a unified, well-structured RBAC model, the system risks unauthorized access, data breaches, and compliance failures, especially as user and group management scales.  

The implementation establishes a robust, normalized RBAC schema that accurately maps permissions to roles, groups, and users, enabling fine-grained access control. It integrates RLS policies to enforce row-level restrictions based on user roles and group memberships, while maintaining efficient query performance through optimized indexing. Audit logging is enhanced to capture all access and permission changes. As a result, the system now enforces consistent, auditable access policies, significantly improving both security posture and operational clarity, laying a solid foundation for future feature expansion and compliance with regulatory standards.

### P06-RBAC-M02 - Permissions catalog seed (>=40 keys) + drift detector. GAP-015.

The task involves establishing a comprehensive permissions catalog with at least 40 predefined access keys and implementing a drift detector to monitor changes in permission configurations over time. This initiative is critical because without a clear, auditable permissions framework, the system risks inconsistent access control, increased security vulnerabilities, and difficulty in compliance with regulatory standards. As the application scales and evolves, unmanaged permission changes can lead to privilege escalation or unauthorized access, making a structured, observable permissions model essential for both security and operational integrity.

The implementation populates a centralized permissions catalog with detailed, standardized access keys—covering roles, resources, and operations—ensuring every access point is explicitly defined and traceable. A drift detector is then integrated to continuously compare current configurations against the baseline catalog, flagging any deviations in real time. As a result, the system now has a living, observable permissions inventory with automated alerts for anomalies, enabling proactive governance, faster incident response, and improved alignment with security policies. This foundational layer supports future scalability and audit readiness.

### P06-RBAC-M03 - Seed base roles (regular_user, tier_N, dsp_specialist, content_specialist, custo

The task involves seeding a foundational set of base roles—regular_user, tier_N, dsp_specialist, content_specialist, customer_care, accountant, deputy_admin, and super_admin—into the system’s role hierarchy. This establishes a core structure that enables granular access control across the platform, ensuring users are assigned appropriate permissions from the outset. Without this, new users would lack predefined access levels, leading to inconsistent experiences and potential security gaps.  

This implementation directly addresses the need for scalable, role-based access control (RBAC) by providing a standardized starting point for role definitions. The function creates these base roles with defined scopes and permissions, allowing downstream modules to inherit or extend them as needed. It ensures consistency in user access across different departments and functions, from content management to financial operations. As a result, the system now includes a robust, pre-configured role framework that supports future feature expansion and compliance with access governance. This foundational layer enables both rapid onboarding and secure, auditable user management across the platform.

### P06-RBAC-M04 - Grant/revoke service with audit + Slack escalation. GAP-015.

The task—Grant/Revoke service with audit and Slack escalation (P06-RBAC-M04)—addresses a critical gap in access control operations by enabling dynamic, auditable management of service permissions. This capability ensures that team members can efficiently grant or revoke access to system services without leaving a trail of actions, which is essential for maintaining accountability and compliance. Without this feature, changes to service access would rely on manual processes, increasing the risk of errors, unauthorized access, and lack of visibility into who made what change when.

When implemented, the system automatically logs every access modification, capturing the user, timestamp, action, and context, and triggers a real-time Slack notification to designated administrators. This function ensures transparency, supports rapid incident response, and enables proactive monitoring. As a result, the project now delivers a secure, traceable, and responsive access control workflow—transforming how permissions are managed from a reactive, opaque process into a proactive, auditable one. The integration of audit logging and automated alerts significantly strengthens both operational resilience and compliance posture.

### P06-RBAC-M05 - Effective permissions evaluator (union of role + user + group grants, deny prece

The task involves developing an effective permissions evaluator that accurately determines whether a user can access a resource based on a comprehensive set of grants—derived from roles, user-specific assignments, and group memberships—while respecting deny precedence and filtering out expired permissions. This capability is critical because without it, systems would fail to enforce consistent access control, leading to both security vulnerabilities and operational inconsistencies. In environments where access decisions must be both precise and dynamic, such a mechanism ensures that permissions are evaluated not just by what is granted, but by what is actually valid and active at any given time.

The implementation evaluates each access request by first aggregating all applicable grants from roles, user-level policies, and group memberships, then applying deny rules that override any allow, ensuring that explicit denials take precedence over implicit permissions. It also filters out any permissions that have expired, based on a defined expiry timestamp. As a result, the system now delivers a reliable, real-time access decision engine that aligns with security best practices, enabling secure, scalable, and auditable access control across all user interactions.

### P06-RBAC-M06 - Redis cache (60s TTL) + PostgreSQL LISTEN/NOTIFY invalidation for effective perm

The task implements a real-time permission invalidation mechanism to ensure that user access rights are consistently up to date across the application. This is achieved by integrating Redis as a cache with a 60-second time-to-live (TTL), storing session-based permissions, while simultaneously using PostgreSQL’s LISTEN/NOTIFY functionality to detect changes in permission data and trigger cache invalidation. This solution addresses a critical gap in the current system where permission updates were not propagated in real time, leading to stale or inconsistent access control—particularly in high-traffic or dynamic environments.  

When a user’s permissions are modified in the database, PostgreSQL emits a notification, which is intercepted by the service layer and used to trigger a cache flush in Redis. The 60-second TTL ensures that any cached permission data expires before it can be used with outdated information. As a result, the system now delivers immediate, consistent access control without requiring full revalidation or manual intervention. This change significantly improves both security and user experience by eliminating the risk of unauthorized access due to stale permissions.

### P06-RBAC-M07 - Bootstrap super_admin + regular_user. GAP-015.

The task involves initializing a system environment by creating and configuring two user roles—super_admin and regular_user—within a role-based access control (RBAC) framework. This foundational step ensures that the system can support both administrative oversight and standard user operations from the outset. Without this setup, the application would lack the necessary access structures to manage permissions, enforce security policies, and enable role-specific functionality.  

The implementation creates these user accounts with defined privileges: the super_admin gains full system access for configuration and management, while the regular_user is granted limited, task-specific permissions. This function establishes a secure, scalable access model that aligns with the project’s security requirements and operational workflow. As a result, the system now supports authenticated user sessions with properly scoped permissions, enabling both administrative control and user engagement without exposing sensitive functions to unauthorized access. The delivery of these initial user profiles has successfully enabled the system to begin operation with a secure, realistic user environment, setting the stage for further development and testing.

### P06-RBAC-M08 - Group CRUD + time-bound group permissions. GAP-015.

The task—implementing group CRUD operations with time-bound permissions—addresses a critical gap in role-based access control (RBAC) within the system. Currently, group permissions are static, meaning once assigned, they remain unchanged regardless of context or timeline. This creates risks such as over-permissioning or outdated access rights that persist beyond their intended validity. By introducing time-bound group permissions, the system can now dynamically manage access rights, ensuring that users only have access during specific periods, aligning with compliance and operational security needs.  

The implementation enables creation, reading, updating, and deletion of groups, with each permission tied to a defined start and end time. When a user is granted access to a group, the permission is not permanent—it activates only during the specified window, after which it expires automatically. This functionality is built on top of existing group management infrastructure, extending it with temporal logic. As a result, the system now supports dynamic, time-sensitive access control, delivering a more secure and flexible authorization model. Permissions are no longer static; they evolve with time, reducing the risk of unauthorized access and improving alignment with business workflows and audit requirements.

### P06-RBAC-M09 - Expiry test with frozen clock (T-1ms / T / T+1ms). GAP-015.

The task involves conducting an expiry test using a frozen clock simulation to validate the behavior of a system at precise time intervals—specifically T-1ms, T (current), and T+1ms—ensuring accurate handling of time-based expiry events. This test is critical for verifying that access control decisions are correctly made within the narrow window of time when a token or session expires. Without such validation, the system could fail to detect expirations in real time, leading to potential security vulnerabilities or unauthorized access during brief, critical timeframes.  

The implementation simulates a frozen clock at three distinct time points, allowing the system to evaluate how it responds to expiry triggers under controlled, deterministic conditions. It checks whether permissions are correctly revoked or re-evaluated as time progresses through these micro-intervals. As a result, the system now includes a robust expiry validation mechanism that reliably detects and responds to time-based access decisions, improving both security and reliability in dynamic environments. This change ensures that the system behaves predictably under time-sensitive conditions, directly supporting compliance with security policies and operational integrity.
