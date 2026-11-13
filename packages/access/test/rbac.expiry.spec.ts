import { describe, it, expect } from 'vitest';
import { computeEffectivePermissions } from '../src/rbac/effective';
import type { RoleAssignment, PermissionGrant, GroupPermGrant } from '../src/rbac/types';

const T = new Date('2026-11-13T12:00:00.000Z');
const T_MINUS_1 = new Date('2026-11-13T11:59:59.999Z');
const T_PLUS_1 = new Date('2026-11-13T12:00:00.001Z');

const ROLE = (exp: Date): RoleAssignment => ({
  roleId: 'r1',
  rolePermissions: ['dsp:*'],
  expiresAt: exp,
  revokedAt: null,
});
const PERM = (exp: Date): PermissionGrant => ({
  permissionKey: 'shop:buy',
  effect: 'allow',
  expiresAt: exp,
  revokedAt: null,
});
const GROUP = (exp: Date): GroupPermGrant => ({
  permissionKey: 'catalog:*',
  effect: 'allow',
  expiresAt: exp,
  revokedAt: null,
  groupActive: true,
});

function has(s: Set<string>, k: string) { return s.has(k); }

describe('rbac expiry boundary (RBAC-M09)', () => {
  it('T-1ms: all three sources active', () => {
    const r = computeEffectivePermissions({
      now: T_MINUS_1,
      userRoles: [ROLE(T)],
      userPermissions: [PERM(T)],
      groupPermissions: [GROUP(T)],
    });
    expect(has(r, 'dsp:*')).toBe(true);
    expect(has(r, 'shop:buy')).toBe(true);
    expect(has(r, 'catalog:*')).toBe(true);
  });

  it('T (exact): all three sources active (strict >)', () => {
    const r = computeEffectivePermissions({
      now: T,
      userRoles: [ROLE(T)],
      userPermissions: [PERM(T)],
      groupPermissions: [GROUP(T)],
    });
    expect(has(r, 'dsp:*')).toBe(true);
    expect(has(r, 'shop:buy')).toBe(true);
    expect(has(r, 'catalog:*')).toBe(true);
  });

  it('T+1ms: all three sources expired', () => {
    const r = computeEffectivePermissions({
      now: T_PLUS_1,
      userRoles: [ROLE(T)],
      userPermissions: [PERM(T)],
      groupPermissions: [GROUP(T)],
    });
    expect(has(r, 'dsp:*')).toBe(false);
    expect(has(r, 'shop:buy')).toBe(false);
    expect(has(r, 'catalog:*')).toBe(false);
  });
});