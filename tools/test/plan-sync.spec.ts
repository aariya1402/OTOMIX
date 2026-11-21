import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(__dirname, '..', '..');
const PLAN_DIR = path.join(ROOT, 'Docs', 'OtoMix Todo-Plan');
const JSON_PATH = path.join(PLAN_DIR, 'OTOMIX_MicroTask_Plan.tasks.json');
const MD_PATH = path.join(PLAN_DIR, 'OTOMIX_MicroTask_Plan.md');
const SYNC_SCRIPT = path.join(ROOT, 'tools', 'scripts', 'plan-sync.ts');

const read = (p: string): string => fs.readFileSync(p, 'utf-8').replace(/^\uFEFF/, '');

interface Task {
  id: string;
  status: string;
  description: string;
  prerequisites: string[];
  test: string;
  spec: string;
  description_fa?: string;
}

function runSync(): void {
  // Use the full path to node and tsx to avoid space issues
  const nodePath = process.execPath;
  const tsxPath = path.join(ROOT, 'node_modules', '.pnpm', 'tsx@*', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  // Find the actual tsx path
  const tsxDir = path.join(ROOT, 'node_modules', '.pnpm');
  let tsxCli = '';
  if (fs.existsSync(tsxDir)) {
    const entries = fs.readdirSync(tsxDir);
    for (const entry of entries) {
      if (entry.startsWith('tsx@')) {
        const candidate = path.join(tsxDir, entry, 'node_modules', 'tsx', 'dist', 'cli.mjs');
        if (fs.existsSync(candidate)) {
          tsxCli = candidate;
          break;
        }
      }
    }
  }
  if (!tsxCli) {
    throw new Error('Could not find tsx CLI');
  }

  execFileSync(nodePath, [tsxCli, SYNC_SCRIPT], {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: 'pipe',
    shell: false,
    timeout: 60000,
  });
}

function parseMdStatus(md: string, taskId: string): string | null {
  // Find the table row for this task ID
  const lines = md.split('\n');
  for (const line of lines) {
    if (line.includes(`| ${taskId} |`)) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        return parts[2]; // Status column
      }
    }
  }
  return null;
}

describe('plan-sync: JSON → MD regeneration', () => {
  let originalMd: string;
  let originalJson: Task[];

  beforeAll(() => {
    originalMd = read(MD_PATH);
    originalJson = JSON.parse(read(JSON_PATH));
  });

  afterAll(() => {
    // Restore original files
    fs.writeFileSync(MD_PATH, originalMd, 'utf-8');
    fs.writeFileSync(JSON_PATH, JSON.stringify(originalJson, null, 2), 'utf-8');
  });

  it('regenerates MD from JSON and preserves statuses', () => {
    // Run the sync script
    runSync();

    // Read the regenerated MD
    const regeneratedMd = read(MD_PATH);

    // Check that all tasks from JSON have matching status in MD
    const mismatches: string[] = [];
    for (const task of originalJson) {
      const mdStatus = parseMdStatus(regeneratedMd, task.id);
      const jsonStatus = task.status === 'TODO' ? '[ ]' : task.status === 'DONE' ? '[x]' : task.status;
      if (mdStatus !== jsonStatus) {
        mismatches.push(`${task.id}: JSON=${jsonStatus} MD=${mdStatus}`);
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('round-trip is stable (byte-equal after second run)', () => {
    // First run
    runSync();
    const firstRunMd = read(MD_PATH);

    // Second run (should be idempotent)
    runSync();
    const secondRunMd = read(MD_PATH);

    expect(secondRunMd).toBe(firstRunMd);
  });

  it('preserves non-task sections (header, footer)', () => {
    runSync();
    const regeneratedMd = read(MD_PATH);

    // Check that key header sections are preserved
    expect(regeneratedMd).toContain('# OTOMIX Micro-Task Plan');
    expect(regeneratedMd).toContain('## 1. Phase Overview Table');
    expect(regeneratedMd).toContain('## 2. Dependency Graph');
    expect(regeneratedMd).toContain('## 4. Test Matrix');
    expect(regeneratedMd).toContain('## 5. Traceability Matrix');
    expect(regeneratedMd).toContain('## 6. Review Log');
    expect(regeneratedMd).toContain('## 7. Open Questions');
  });

  it('Section B status flips are reflected in JSON', () => {
    const tasks = JSON.parse(read(JSON_PATH));
    const taskMap = new Map(tasks.map((t: Task) => [t.id, t]));

    // Verify specific Section B changes
    expect(taskMap.get('P05-T02-S02-M05')?.status).toBe('SUPERSEDED:SUPERSEDED-006');
    expect(taskMap.get('P05-T02-S02-M06')?.status).toBe('SUPERSEDED:SUPERSEDED-006');
    expect(taskMap.get('P06-T02-S01-M03')?.status).toBe('DONE');
    expect(taskMap.get('P06-T02-S02-M02')?.status).toBe('DONE');
  });

  it('Section B prerequisite re-pointing is reflected in JSON', () => {
    const tasks = JSON.parse(read(JSON_PATH));
    const taskMap = new Map(tasks.map((t: Task) => [t.id, t]));

    // P07-T03-S02-M02: P06-T02-S01-M03 → P06-RBAC-M11
    const p07t03s02m02 = taskMap.get('P07-T03-S02-M02');
    expect(p07t03s02m02?.prerequisites).toContain('P06-RBAC-M11');
    expect(p07t03s02m02?.prerequisites).not.toContain('P06-T02-S01-M03');

    // P08-T01-S01-M01: P06-T02-S01-M03 → P06-RBAC-M11, GATE0-DOC-M03, GATE0-P05-M07
    const p08t01s01m01 = taskMap.get('P08-T01-S01-M01');
    expect(p08t01s01m01?.prerequisites).toContain('P06-RBAC-M11');
    expect(p08t01s01m01?.prerequisites).toContain('GATE0-DOC-M03');
    expect(p08t01s01m01?.prerequisites).toContain('GATE0-P05-M07');
    expect(p08t01s01m01?.prerequisites).not.toContain('P06-T02-S01-M03');

    // P08-T04-S02-M02: P06-T02-S01-M03 → P06-RBAC-M11
    const p08t04s02m02 = taskMap.get('P08-T04-S02-M02');
    expect(p08t04s02m02?.prerequisites).toContain('P06-RBAC-M11');
    expect(p08t04s02m02?.prerequisites).not.toContain('P06-T02-S01-M03');
  });
});