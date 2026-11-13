import { describe, it, expect } from 'vitest';
import { computeEffectivePermissions } from '../src/rbac/effective';
import type { RoleAssignment, PermissionGrant, GroupPermGrant } from '../src/rbac/types';

const NOW = new Date('2026-11-13T12:00:00.000Z');
const PAST = new Date('2026-11-13T11:59:59.999Z');
const FUT = new Date('2026-11-13T12:00:00.001Z');
function role(p: string[], exp: Date | null = null, rev: Date | null = null): RoleAssignment {
  return { roleId: 'r', rolePermissions: p, expiresAt: exp, revokedAt: rev };
}
function perm(k: string, e: 'allow' | 'deny', exp: Date | null = null, rev: Date | null = null): PermissionGrant {
  return { permissionKey: k, effect: e, expiresAt: exp, revokedAt: rev };
}
function gp(k: string, e: 'allow' | 'deny', active = true, exp: Date | null = null, rev: Date | null = null): GroupPermGrant {
  return { permissionKey: k, effect: e, expiresAt: exp, revokedAt: rev, groupActive: active };
}
function arr(s: Set<string>): string[] { return Array.from(s).sort(); }

describe('computeEffectivePermissions (RBAC-M05)', () => {
  it('unions role + direct + group allows', () => {
    const r = computeEffectivePermissions({ now: NOW, userRoles: [role(['dsp:*', 'audio:tuning'])], userPermissions: [perm('local:process', 'allow')], groupPermissions: [gp('catalog:*', 'allow')] });
    expect(arr(r)).toEqual(['audio:tuning', 'catalog:*', 'dsp:*', 'local:process']);
  });
  it('deny overrides role allow (review checkpoint)', () => {
    const r = computeEffectivePermissions({ now: NOW, userRoles: [role(['dsp:*'])], userPermissions: [perm('dsp:*', 'deny')], groupPermissions: [] });
    expect(r.has('dsp:*')).toBe(false);
  });
  it('expired at exact now is inactive (strict >)', () => {
    const r = computeEffectivePermissions({ now: NOW, userRoles: [], userPermissions: [perm('shop:buy', 'allow', NOW)], groupPermissions: [] });
    expect(r.has('shop:buy')).toBe(false);
  });
  it('future-dated allow is included', () => {
    const r = computeEffectivePermissions({ now: NOW, userRoles: [], userPermissions: [perm('shop:buy', 'allow', FUT)], groupPermissions: [] });
    expect(r.has('shop:buy')).toBe(true);
  });
  it('revoked role is excluded', () => {
    const r = computeEffectivePermissions({ now: NOW, userRoles: [role(['mastering:*'], null, NOW)], userPermissions: [], groupPermissions: [] });
    expect(r.size).toBe(0);
  });
  it('group deny overrides role allow', () => {
    const r = computeEffectivePermissions({ now: NOW, userRoles: [role(['dsp:*'])], userPermissions: [], groupPermissions: [gp('dsp:*', 'deny')] });
    expect(r.has('dsp:*')).toBe(false);
  });
  it('inactive group membership is ignored', () => {
    const r = computeEffectivePermissions({ now: NOW, userRoles: [], userPermissions: [], groupPermissions: [gp('catalog:*', 'allow', false)] });
    expect(r.size).toBe(0);
  });
  it('mixed realistic case', () => {
    const r = computeEffectivePermissions({ now: NOW, userRoles: [role(['dsp:*', 'analysis:run'])], userPermissions: [perm('analysis:run', 'deny'), perm('shop:buy', 'allow', PAST)], groupPermissions: [gp('catalog:*', 'allow')] });
    expect(arr(r)).toEqual(['catalog:*', 'dsp:*']);
  });
  it('deny with no matching allow is a no-op', () => {
    const r = computeEffectivePermissions({ now: NOW, userRoles: [], userPermissions: [perm('dsp:*', 'deny')], groupPermissions: [] });
    expect(r.size).toBe(0);
  });
  it('empty input', () => {
    const r = computeEffectivePermissions({ now: NOW, userRoles: [], userPermissions: [], groupPermissions: [] });
    expect(r.size).toBe(0);
  });
});
