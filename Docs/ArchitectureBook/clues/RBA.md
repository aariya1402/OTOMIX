# RBA Clues

## RBAC-M01
**Commit**: b3f0db8  |  **Generated**: 2026-11-14 00:36


**Files changed**:
  - `.../OTOMIX_MicroTask_Plan_Supplement.md` (+- 2)
  - `packages/db/migrations/004_rbac.sql` (+++++++++++++++++++++ 172)
  - `packages/db/test/rbac.migration.spec.ts` (+++++++++++++++++ 138)
  - `vitest.workspace.ts` (+ 1)
**New tests**: 12

---


## RBAC-M02
**Commit**: 8985495  |  **Generated**: 2026-11-14 00:36


**Files changed**:
  - `packages/db/package.json` (+ 1)
  - `packages/db/seeds/permissions.seed.down.sql` (+ 1)
  - `packages/db/seeds/permissions.seed.sql` (++++++++++++++++ 61)
  - `packages/db/src/seed.ts` (+++++++++++ 41)
  - `packages/db/test/rbac.seed.spec.ts` (++++++++++++++++++++++++++++ 106)
  - `tools/scripts/scan-features.ts` (++++++++++++++++ 59)
  - `vitest.workspace.ts` (+ 1)
**New tests**: 6

---


## RBAC-M03
**Commit**: 65adbc7  |  **Generated**: 2026-11-14 00:36


**Files changed**:
  - `packages/db/test/rbac.roles.seed.spec.ts` (+++++++++++-------------------- 173)
**New tests**: 6

---


## RBAC-M04
**Commit**: 6e6c01c  |  **Generated**: 2026-11-14 00:36


**Files changed**:
  - `.../OTOMIX_MicroTask_Plan_Supplement.md` (+- 2)
  - `packages/access/package.json` (+ 3)
  - `packages/access/src/rbac/grant-service.ts` (+++++++++++++++++++++ 124)
  - `packages/access/test/rbac.grant-service.spec.ts` (+++++++++++++++ 87)
  - `.../005_admin_audit_default_partition.sql` (+ 6)
  - `pnpm-lock.yaml` (++++ 21)
  - `vitest.workspace.ts` (+ 1)
**New exports**: ActorContext, createGrantService, GrantError, GrantPermissionInput, GrantResult, GrantRoleInput, GrantService, GrantServiceDeps, InvalidGrantInputError, RevokePermissionInput, RevokeRoleInput, TargetNotFoundError, UnauthorizedGrantError
**New tests**: 8

---


## RBAC-M05
**Commit**: d31c73f  |  **Generated**: 2026-11-14 00:36


**Files changed**:
  - `.../OTOMIX_MicroTask_Plan_Supplement.md` (+- 2)
  - `packages/access/src/rbac/effective.ts` (+++++++++++ 29)
  - `packages/access/src/rbac/types.ts` (++++++++++ 26)
  - `packages/access/test/rbac.effective.spec.ts` (++++++++++++++++++++++ 60)
**New exports**: computeEffectivePermissions, EffectivePermissionsInput, GroupPermGrant, PermissionGrant, RbacEffect, RoleAssignment
**New tests**: 10

---


## RBAC-M06
**Commit**: cd9fe99  |  **Generated**: 2026-11-14 00:36


**Files changed**:
  - `.../OTOMIX_MicroTask_Plan_Supplement.md` (+- 2)
  - `packages/access/src/constants.ts` (+ 1)
  - `packages/access/src/rbac/cache.ts` (+++++++++++++++++ 68)
  - `packages/access/test/rbac.cache.spec.ts` (++++++++++++++++++++++ 86)
  - `vitest.workspace.ts` (+ 1)
**New exports**: CacheCtx, createRbacCache, publishInvalidation, RBAC_CACHE_TTL_SECONDS, RbacCache, RbacCacheDeps
**New tests**: 8

---


## RBAC-M07
**Commit**: dedd314  |  **Generated**: 2026-11-14 00:36


**Files changed**:
  - `.../OTOMIX_MicroTask_Plan_Supplement.md` (+- 2)
  - `packages/access/src/rbac/bootstrap.ts` (++++++++++++++++++++ 75)
  - `packages/access/test/rbac.bootstrap.spec.ts` (++++++++++++++++++++++ 81)
  - `vitest.workspace.ts` (+ 1)
**New exports**: BootstrapInput, BootstrapResult, bootstrapTenant, ensureBootstrap
**New tests**: 6

---


## RBAC-M08
**Commit**: 6e7826a  |  **Generated**: 2026-11-14 00:36


**Files changed**:
  - `.../OTOMIX_MicroTask_Plan_Supplement.md` (+- 2)
  - `packages/access/src/rbac/groups.ts` (+++++++++++++++++++++ 165)
  - `packages/access/test/rbac.groups.spec.ts` (++++++++++++++ 114)
  - `vitest.workspace.ts` (+ 1)
**New exports**: ActorContext, AddMemberInput, CreateGroupInput, createGroupsService, DeleteGroupInput, GrantGroupPermissionInput, GrantGroupPermissionResult, GroupNotFoundError, GroupResult, GroupsError, GroupsService, GroupsServiceDeps, InvalidGroupsInputError, RemoveMemberInput, RevokeGroupPermissionInput, UnauthorizedGroupsError
**New tests**: 8

---


## RBAC-M09
**Commit**: 776ce41  |  **Generated**: 2026-11-14 00:36


**Files changed**:
  - `.../OTOMIX_MicroTask_Plan_Supplement.md` (+- 2)
  - `packages/access/src/rbac/effective.ts` (+- 2)
  - `packages/access/test/rbac.expiry.spec.ts` (++++++++++++++++++++++ 67)
**New tests**: 3

---


## RBAC-M10
**Commit**: 30eb2e0  |  **Generated**: 2026-11-14 00:36


**Files changed**:
  - `.../OTOMIX_MicroTask_Plan_Supplement.md` (+- 4)
  - `packages/access/src/index.ts` (-- 6)
  - `packages/access/src/scope-allowlist.ts` (------------ 37)
  - `packages/access/src/token/issue.ts` (---- 10)
  - `packages/access/src/token/types.ts` (++------ 25)
  - `packages/access/test/scope-allowlist.spec.ts` (---------------------- 66)
  - `packages/access/test/token.issue.spec.ts` (++++-------------- 56)
  - `packages/gateway/src/interceptor.ts` (+++--------- 37)
  - `packages/gateway/test/interceptor.spec.ts` (++++----------- 47)
**New exports**: verifyRequest
**New tests**: 4

---


## RBAC-M12
**Commit**: 66352be  |  **Generated**: 2026-11-14 00:36


**Files changed**:
  - `.../OTOMIX_MicroTask_Plan_Supplement.md` (+- 4)
  - `features/step_definitions/authz.steps.ts` (+++----- 41)
  - `features/support/world.ts` (+- 5)
  - `tools/scripts/generate-authz-feature.ts` (++++++++++++--------- 115)
**New tests**: 0

---


