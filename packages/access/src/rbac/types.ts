export type RbacEffect = 'allow' | 'deny';
export interface RoleAssignment {
  roleId: string;
  rolePermissions: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
}
export interface PermissionGrant {
  permissionKey: string;
  effect: RbacEffect;
  expiresAt: Date | null;
  revokedAt: Date | null;
}
export interface GroupPermGrant {
  permissionKey: string;
  effect: RbacEffect;
  expiresAt: Date | null;
  revokedAt: Date | null;
  groupActive: boolean;
}
export interface EffectivePermissionsInput {
  now: Date;
  userRoles: RoleAssignment[];
  userPermissions: PermissionGrant[];
  groupPermissions: GroupPermGrant[];
}
