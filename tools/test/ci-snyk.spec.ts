import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const workflowPath = resolve(__dirname, '..', '..', '.github', 'workflows', 'ci.yml');
const raw = readFileSync(workflowPath, 'utf-8');

function hasJob(raw: string, jobName: string): boolean {
  const re = new RegExp('^\\s{2}' + jobName.replace(/[-]/g, '[-]') + '\\s*:\\s*$', 'm');
  return re.test(raw);
}

function needsOf(raw: string, jobName: string): string[] {
  const lines = raw.split(/\r?\n/);
  const startRe = new RegExp('^\\s{2}' + jobName.replace(/[-]/g, '[-]') + '\\s*:\\s*$');
  let inJob = false;
  const result: string[] = [];
  for (const line of lines) {
    if (startRe.test(line)) { inJob = true; continue; }
    if (inJob && /^\s{2}[A-Za-z]/.test(line)) { break; }
    if (inJob && /^\s+needs\s*:\s*(.+)$/.test(line)) {
      const m = line.match(/^\s+needs\s*:\s*(.+)$/);
      if (m) {
        const body = m[1].trim();
        if (body.startsWith('[') && body.endsWith(']')) {
          body.substring(1, body.length - 1).split(',').forEach((s) => {
            const v = s.trim().replace(/^['"]|['"]$/g, '');
            if (v) result.push(v);
          });
        } else {
          result.push(body.replace(/^['"]|['"]$/g, ''));
        }
      }
    }
  }
  return result;
}

describe('CI workflow — Snyk scan job (P06-T06-S01-M02)', () => {
  it('snyk-scan job exists', () => {
    expect(hasJob(raw, 'snyk-scan')).toBe(true);
  });

  it('build job needs snyk-scan', () => {
    expect(needsOf(raw, 'build')).toContain('snyk-scan');
  });

  it('deploy job needs snyk-scan', () => {
    expect(needsOf(raw, 'deploy')).toContain('snyk-scan');
  });
});