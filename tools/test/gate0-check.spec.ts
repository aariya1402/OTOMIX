import { describe, it, expect } from 'vitest';
import { checkCriticalTasks, checkCatalogFixture } from '../scripts/gate0-check';

interface Task {
  id: string;
  status: string;
  description: string;
  prerequisites: string[];
  test: string;
  spec: string;
}

const FIXTURE_TASKS: Task[] = [
  { id: 'GATE0-DEC-M01', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-DEC-M02', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-DEC-M03', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-DOC-M01', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-DOC-M03', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-VER-M01', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-VER-M02', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-VER-M03', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-P05-M01', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-P05-M02', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-P05-M03', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-P05-M04', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-P05-M04', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-P05-M05', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-P05-M06', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-P05-M07', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-SEC-M01', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-SEC-M03', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
  { id: 'GATE0-CHK-M01', status: 'DONE', description: '', prerequisites: [], test: '', spec: '' },
];

describe('gate0-check: Gate-0 exit validation', () => {
  it('checkCriticalTasks passes when all GATE0-* tasks are DONE', () => {
    const result = checkCriticalTasks(FIXTURE_TASKS);
    expect(result.passed).toBe(true);
    expect(result.failed).toEqual([]);
  });

  it('checkCriticalTasks fails when a GATE0-* task is TODO', () => {
    const tasks = FIXTURE_TASKS.map(t => t.id === 'GATE0-SEC-M01' ? { ...t, status: 'TODO' } : t);
    const result = checkCriticalTasks(tasks);
    expect(result.passed).toBe(false);
    expect(result.failed).toContain('GATE0-SEC-M01 (status: TODO)');
  });

  it('checkCriticalTasks fails when a GATE0-* task is BLOCKED', () => {
    const tasks = FIXTURE_TASKS.map(t => t.id === 'GATE0-DEC-M01' ? { ...t, status: 'BLOCKED:OQ-99' } : t);
    const result = checkCriticalTasks(tasks);
    expect(result.passed).toBe(false);
    expect(result.failed).toContain('GATE0-DEC-M01 (status: BLOCKED:OQ-99)');
  });

  it('checkCriticalTasks fails when a GATE0-* task is SUPERSEDED', () => {
    const tasks = FIXTURE_TASKS.map(t => t.id === 'GATE0-VER-M01' ? { ...t, status: 'SUPERSEDED:GAP-999' } : t);
    const result = checkCriticalTasks(tasks);
    expect(result.passed).toBe(false);
    expect(result.failed).toContain('GATE0-VER-M01 (status: SUPERSEDED:GAP-999)');
  });

  it('checkCatalogFixture passes when all required files exist', () => {
    const result = checkCatalogFixture();
    expect(result.passed).toBe(true);
    expect(result.errors).toEqual([]);
  });
});