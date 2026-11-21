#!/usr/bin/env node
/**
 * plan-sync.ts — One-way JSON → MD regeneration for OTOMIX Micro-Task Plan
 *
 * This script reads `OTOMIX_MicroTask_Plan.tasks.json` and regenerates
 * `OTOMIX_MicroTask_Plan.md` from it. The JSON is the source of truth.
 *
 * Usage: npx tsx tools/scripts/plan-sync.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const PLAN_DIR = path.join(ROOT, 'Docs', 'OtoMix Todo-Plan');
const JSON_PATH = path.join(PLAN_DIR, 'OTOMIX_MicroTask_Plan.tasks.json');
const MD_PATH = path.join(PLAN_DIR, 'OTOMIX_MicroTask_Plan.md');

interface Task {
  id: string;
  status: string;
  description: string;
  prerequisites: string[];
  test: string;
  spec: string;
  description_fa?: string;
}

function readJson(): Task[] {
  const raw = fs.readFileSync(JSON_PATH, 'utf-8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function readMd(p: string): string {
  return fs.readFileSync(p, 'utf-8').replace(/^\uFEFF/, '');
}

function writeMd(p: string, content: string): void {
  fs.writeFileSync(p, content, 'utf-8');
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function formatPrereqs(prereqs: string[]): string {
  if (prereqs.length === 0) return '—';
  return prereqs.map(p => `\`${p}\``).join(', ');
}

function formatTest(test: string): string {
  const parts = test.split('|');
  if (parts.length < 3) return test;
  const [type, runner, locator, ...descParts] = parts;
  const desc = descParts.join('|');
  return `\`${type}\` · \`${runner}\` · \`${locator}\`${desc ? ` — ${desc}` : ''}`;
}

function generateTaskRow(task: Task): string {
  const statusCell = task.status === 'TODO' ? '[ ]' : task.status === 'DONE' ? '[x]' : task.status;
  const desc = escapeMd(task.description);
  const prereqs = formatPrereqs(task.prerequisites);
  const test = formatTest(task.test);
  const spec = escapeMd(task.spec);
  return `| ${task.id} | ${statusCell} | ${desc} | ${prereqs} | ${test} | ${spec} |`;
}

function generatePhaseSection(phaseId: string, phaseName: string, tasks: Task[]): string {
  const phaseTasks = tasks.filter(t => t.id.startsWith(phaseId + '-'));
  if (phaseTasks.length === 0) return '';

  let out = `### ${phaseId} ${phaseName}\n\n`;
  out += '| ID | Status | Description | Prerequisites | Test | Spec |\n';
  out += '|---|---|---|---|---|---|\n';
  for (const task of phaseTasks) {
    out += generateTaskRow(task) + '\n';
  }
  out += '\n';
  return out;
}

function generateAddendumSection(tasks: Task[]): string {
  const addendumTasks = tasks.filter(t => t.id.startsWith('P05-ADD-'));
  if (addendumTasks.length === 0) return '';

  let out = '## P05 Addendum Tasks\n\n';
  out += '| ID | Status | Description | Prerequisites | Test | Spec |\n';
  out += '|---|---|---|---|---|---|\n';
  for (const task of addendumTasks) {
    out += generateTaskRow(task) + '\n';
  }
  out += '\n';
  return out;
}

function generateGate0Section(tasks: Task[]): string {
  const gate0Tasks = tasks.filter(t => t.id.startsWith('GATE0-'));
  if (gate0Tasks.length === 0) return '';

  let out = '## GATE-0 Tasks (Pre-P08 Stabilization)\n\n';
  out += '| ID | Status | Description | Prerequisites | Test | Spec |\n';
  out += '|---|---|---|---|---|---|\n';
  for (const task of gate0Tasks) {
    out += generateTaskRow(task) + '\n';
  }
  out += '\n';
  return out;
}

function generateXSection(tasks: Task[]): string {
  const xTasks = tasks.filter(t => t.id.startsWith('X-'));
  if (xTasks.length === 0) return '';

  let out = '## Cross-Cutting Tasks (X-*)\n\n';
  out += '| ID | Status | Description | Prerequisites | Test | Spec |\n';
  out += '|---|---|---|---|---|---|\n';
  for (const task of xTasks) {
    out += generateTaskRow(task) + '\n';
  }
  out += '\n';
  return out;
}

function generateP07RegSection(tasks: Task[]): string {
  const regTasks = tasks.filter(t => t.id.startsWith('P07-REG-'));
  if (regTasks.length === 0) return '';

  let out = '## P07 Registration Tasks (REG-*)\n\n';
  out += '| ID | Status | Description | Prerequisites | Test | Spec |\n';
  out += '|---|---|---|---|---|---|\n';
  for (const task of regTasks) {
    out += generateTaskRow(task) + '\n';
  }
  out += '\n';
  return out;
}

function generateP06RbacSection(tasks: Task[]): string {
  const rbacTasks = tasks.filter(t => t.id.startsWith('P06-RBAC-'));
  if (rbacTasks.length === 0) return '';

  let out = '## P06 RBAC Migration Tasks (RBAC-*)\n\n';
  out += '| ID | Status | Description | Prerequisites | Test | Spec |\n';
  out += '|---|---|---|---|---|---|\n';
  for (const task of rbacTasks) {
    out += generateTaskRow(task) + '\n';
  }
  out += '\n';
  return out;
}

function main(): void {
  const tasks = readJson();

  // Read the original MD to preserve the header and non-task sections
  const originalMd = readMd(MD_PATH);

  // Find the start of the task tables (after "## 3. Phase-by-Phase Breakdown")
  const phaseBreakdownIdx = originalMd.indexOf('## 3. Phase-by-Phase Breakdown');
  if (phaseBreakdownIdx === -1) {
    console.error('Could not find "## 3. Phase-by-Phase Breakdown" in MD');
    process.exit(1);
  }

  // Find the end of the task tables (before "## 4. Test Matrix")
  const testMatrixIdx = originalMd.indexOf('## 4. Test Matrix', phaseBreakdownIdx);
  if (testMatrixIdx === -1) {
    console.error('Could not find "## 4. Test Matrix" in MD');
    process.exit(1);
  }

  const header = originalMd.slice(0, phaseBreakdownIdx);
  const footer = originalMd.slice(testMatrixIdx);

  // Generate new task sections
  let newContent = header;
  newContent += '## 3. Phase-by-Phase Breakdown\n\n';

  // P01
  newContent += generatePhaseSection('P01', 'Foundation & Shared Contracts', tasks);
  // P02
  newContent += generatePhaseSection('P02', 'Beat-Index Engine & Absolute Locked Grid', tasks);
  // P03
  newContent += generatePhaseSection('P03', 'Dual Grid & Runtime Observer', tasks);
  // P04
  newContent += generatePhaseSection('P04', 'DSP Port & Real-Time Safety', tasks);
  // P05
  newContent += generatePhaseSection('P05', 'Feature Extraction & Analysis Pipeline', tasks);
  // P05 Addendum
  newContent += generateAddendumSection(tasks);
  // P06
  newContent += generatePhaseSection('P06', 'Security, RBAC & Tenant Isolation', tasks);
  // P06 RBAC
  newContent += generateP06RbacSection(tasks);
  // P07
  newContent += generatePhaseSection('P07', 'Local Ingestion & Hostile-File Handling', tasks);
  // P07 REG
  newContent += generateP07RegSection(tasks);
  // P08
  newContent += generatePhaseSection('P08', 'MixPlan, UI & Redux Architecture', tasks);
  // P09
  newContent += generatePhaseSection('P09', 'XML Export & Set Shop', tasks);
  // P10
  newContent += generatePhaseSection('P10', 'Observability, Deployment & DR', tasks);
  // P11
  newContent += generatePhaseSection('P11', 'Hardening, Determinism Proof & Acceptance', tasks);
  // GATE-0
  newContent += generateGate0Section(tasks);
  // X-*
  newContent += generateXSection(tasks);

  newContent += footer;

  writeMd(MD_PATH, newContent);
  console.log('✅ MD regenerated from JSON');
}

main();