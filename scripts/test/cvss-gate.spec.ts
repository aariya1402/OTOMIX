import { describe, it, expect } from 'vitest';
import { evaluateGate } from '../cvss-gate';

describe('CVSS Gate', () => {
  it('passes when maximum CVSS is 6.9', () => {
    const findings = [
      { cveId: 'CVE-LOW', cvssScore: 6.9, packageName: 'pkg-low' },
    ];
    const result = evaluateGate(findings);
    expect(result.exitCode).toBe(0);
    expect(result.offending).toHaveLength(0);
  });

  it('blocks when any finding is at CVSS 7.0', () => {
    const findings = [
      { cveId: 'CVE-HIGH', cvssScore: 7.0, packageName: 'pkg-high' },
    ];
    const result = evaluateGate(findings);
    expect(result.exitCode).toBe(1);
    expect(result.offending).toHaveLength(1);
  });

  it('blocks when any finding exceeds CVSS 7.0', () => {
    const findings = [
      { cveId: 'CVE-CRIT', cvssScore: 9.8, packageName: 'pkg-crit' },
    ];
    const result = evaluateGate(findings);
    expect(result.exitCode).toBe(1);
    expect(result.offending[0]?.cveId).toBe('CVE-CRIT');
  });
});
