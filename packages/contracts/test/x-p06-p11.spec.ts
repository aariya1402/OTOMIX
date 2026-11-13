import { describe, it, expect } from 'vitest';

// P06-T04-S01-M01 covers unmounted routes; T04-S02 covers tenant isolation.
// P11-T05-S01-M01 will execute the 6 attacks in §10.5. Here we just
// assert the mapping is declared and complete.
const ISOLATION_ATTACKS = [
  { id: 'iso-01', description: 'forged tenant_id parameter in body/header', mitigatedBy: 'interceptor reads tenant from claim only' },
  { id: 'iso-02', description: 'cross-tenant token replay', mitigatedBy: 'expectedTenantId check' },
  { id: 'iso-03', description: 'direct SQL via app_user without app.tenant_id', mitigatedBy: 'RLS + FORCE RLS' },
  { id: 'iso-04', description: 'cache key collision between tenants', mitigatedBy: 'otomix: prefix + namespaced-clients' },
  { id: 'iso-05', description: 'unmounted route probing (ddex, rights, dsr, stream)', mitigatedBy: 'route-table returns 404 pre-auth' },
  { id: 'iso-06', description: 'issuance of forbidden scope', mitigatedBy: 'RBAC catalog + grant service' },
];

describe('X-P06-P11: isolation attack map', () => {
  it('all 6 §10.5 attacks are mapped to a mitigation', () => {
    expect(ISOLATION_ATTACKS.length).toBe(6);
    for (const a of ISOLATION_ATTACKS) {
      expect(a.id).toMatch(/^iso-0[1-6]$/);
      expect(a.description.length).toBeGreaterThan(0);
      expect(a.mitigatedBy.length).toBeGreaterThan(0);
    }
  });
});