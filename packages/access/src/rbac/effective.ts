import type { EffectivePermissionsInput } from './types';

function isActive(revokedAt: Date | null, expiresAt: Date | null, now: Date): boolean {
  if (revokedAt !== null) return false;
  if (expiresAt === null) return true;
  return expiresAt.getTime() >= now.getTime();
}

export function computeEffectivePermissions(input: EffectivePermissionsInput): Set<string> {
  const allow = new Set<string>();
  const deny = new Set<string>();
  for (const r of input.userRoles) {
    if (!isActive(r.revokedAt, r.expiresAt, input.now)) continue;
    for (const p of r.rolePermissions) allow.add(p);
  }
  for (const g of input.userPermissions) {
    if (!isActive(g.revokedAt, g.expiresAt, input.now)) continue;
    if (g.effect === 'allow') allow.add(g.permissionKey);
    else deny.add(g.permissionKey);
  }
  for (const gp of input.groupPermissions) {
    if (!gp.groupActive) continue;
    if (!isActive(gp.revokedAt, gp.expiresAt, input.now)) continue;
    if (gp.effect === 'allow') allow.add(gp.permissionKey);
    else deny.add(gp.permissionKey);
  }
  for (const d of deny) allow.delete(d);
  return allow;
}
