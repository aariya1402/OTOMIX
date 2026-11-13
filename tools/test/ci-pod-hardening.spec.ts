import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(__dirname, '..', '..');

function exists(p: string): boolean {
  return existsSync(resolve(ROOT, p));
}

function read(p: string): string {
  return readFileSync(resolve(ROOT, p), 'utf-8');
}

describe('pod hardening assets (P06-T06-S01-M03)', () => {
  it('deploy/base/ contains namespace, deployment, networkpolicy', () => {
    expect(exists('deploy/base/namespace.yaml')).toBe(true);
    expect(exists('deploy/base/deployment.yaml')).toBe(true);
    expect(exists('deploy/base/networkpolicy.yaml')).toBe(true);
    expect(exists('deploy/base/kustomization.yaml')).toBe(true);
  });

  it('deployment enforces key hardening fields', () => {
    const y = read('deploy/base/deployment.yaml');
    expect(y).toMatch(/runAsNonRoot:\s*true/);
    expect(y).toMatch(/readOnlyRootFilesystem:\s*true/);
    expect(y).toMatch(/allowPrivilegeEscalation:\s*false/);
    expect(y).toMatch(/drop:\s*\[\s*"ALL"\s*\]/);
    expect(y).toMatch(/hostNetwork:\s*false/);
    expect(y).toMatch(/hostPID:\s*false/);
    expect(y).toMatch(/hostIPC:\s*false/);
  });

  it('namespace annotated with otomix.networkpolicy=managed and default-deny present', () => {
    const ns = read('deploy/base/namespace.yaml');
    expect(ns).toMatch(/otomix\.networkpolicy:\s*managed/);
    const np = read('deploy/base/networkpolicy.yaml');
    expect(np).toMatch(/kind:\s*NetworkPolicy/);
    expect(np).toMatch(/name:\s*default-deny/);
    expect(np).toMatch(/policyTypes:[\s\S]*Ingress/);
    expect(np).toMatch(/policyTypes:[\s\S]*Egress/);
  });

  it('OPA policy covers all required checks and negative fixtures exist', () => {
    const rego = read('policy/pod-hardening.rego');
    for (const s of ['hostNetwork', 'hostPID', 'hostIPC', 'runAsNonRoot', 'readOnlyRootFilesystem', 'allowPrivilegeEscalation', 'drop', 'otomix.networkpolicy']) {
      expect(rego).toContain(s);
    }
    expect(exists('policy/testdata/unhardened-pod.yaml')).toBe(true);
    expect(exists('policy/testdata/unhardened-namespace.yaml')).toBe(true);
  });
});