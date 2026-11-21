// X-DR-M01: Test that every GAP-014 tagged task has a cloud and local sibling
// GAP-014: Dual deployment (cloud + local) — every open P05/P07 task gets siblings

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const TASKS_JSON = path.resolve(__dirname, '..', '..', 'Docs', 'OtoMix Todo-Plan', 'OTOMIX_MicroTask_Plan.tasks.json');

interface Task {
  id: string;
  status: string;
  description: string;
}

function loadTasks(): Task[] {
  const content = fs.readFileSync(TASKS_JSON, 'utf-8');
  const data = JSON.parse(content);
  return data;
}

function isGap014Tagged(task: Task): boolean {
  // Tasks tagged with GAP-014 in their spec field
  return task.description.includes('GAP-014') ||
         task.id.includes('GAP-014') ||
         task.id.endsWith('-CLOUD') ||
         task.id.endsWith('-LOCAL');
}

function getBaseId(id: string): string {
  // Remove -CLOUD or -LOCAL suffix to get base ID
  return id.replace(/-CLOUD$/, '').replace(/-LOCAL$/, '');
}

// Base tasks that need GAP-014 siblings (open P05/P07 tasks from the register)
const BASE_TASKS_NEEDING_SIBLINGS = [
  'GATE0-P05-M06',
  'GATE0-P05-M07',
  'GATE0-VER-M01',
  'P07-T05-S01-M01',
  'P07-REG-M02',
];

describe('X-DR-M01: GAP-014 Sibling Task Register', () => {
  let tasks: Task[];
  let taskMap: Map<string, Task>;

  beforeAll(() => {
    tasks = loadTasks();
    taskMap = new Map(tasks.map(t => [t.id, t]));
  });

  it('every base task needing siblings has a cloud sibling', () => {
    for (const baseId of BASE_TASKS_NEEDING_SIBLINGS) {
      const cloudId = baseId + '-CLOUD';
      expect(taskMap.has(cloudId)).toBe(true);
    }
  });

  it('every base task needing siblings has a local sibling', () => {
    for (const baseId of BASE_TASKS_NEEDING_SIBLINGS) {
      const localId = baseId + '-LOCAL';
      expect(taskMap.has(localId)).toBe(true);
    }
  });

  it('each sibling pair shares the same base ID', () => {
    const cloudTasks = tasks.filter(t => t.id.endsWith('-CLOUD'));
    
    for (const cloudTask of cloudTasks) {
      const baseId = getBaseId(cloudTask.id);
      const localId = baseId + '-LOCAL';
      expect(taskMap.has(localId)).toBe(true);
    }
  });

  it('each sibling pair has opposite deployment suffix', () => {
    const cloudTasks = tasks.filter(t => t.id.endsWith('-CLOUD'));
    
    for (const cloudTask of cloudTasks) {
      const baseId = getBaseId(cloudTask.id);
      const localTask = taskMap.get(baseId + '-LOCAL');
      expect(localTask).toBeDefined();
      expect(localTask?.id).toBe(baseId + '-LOCAL');
    }
  });

  it('no duplicate sibling IDs exist', () => {
    const ids = tasks.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('all GAP-014 tagged tasks have GAP-014 in their spec', () => {
    const gap014Tasks = tasks.filter(t => isGap014Tagged(t));
    
    for (const task of gap014Tasks) {
      expect(task.spec).toContain('GAP-014');
    }
  });

  it('GAP-014 register has at least the expected minimum tasks', () => {
    const gap014Tasks = tasks.filter(t => isGap014Tagged(t));
    
    // Should have at least:
    // - 2 for GATE0-P05-M06 (cloud + local)
    // - 2 for GATE0-P05-M07 (cloud + local)
    // - 2 for GATE0-VER-M01 (cloud + local)
    // - 2 for P07-T05-S01-M01 (cloud + local)
    // - 2 for P07-REG-M02 (cloud + local)
    // = 10 minimum
    expect(gap014Tasks.length).toBeGreaterThanOrEqual(10);
  });

  it('cloud and local siblings have matching prerequisites structure', () => {
    const gap014Tasks = tasks.filter(t => isGap014Tagged(t));
    
    for (const task of gap014Tasks) {
      const baseId = getBaseId(task.id);
      const cloudTask = taskMap.get(baseId + '-CLOUD');
      const localTask = taskMap.get(baseId + '-LOCAL');
      
      if (cloudTask && localTask) {
        // Both should have prerequisites arrays
        expect(Array.isArray(cloudTask.prerequisites)).toBe(true);
        expect(Array.isArray(localTask.prerequisites)).toBe(true);
      }
    }
  });

  it('P10/P11 template rows are documented (not actual tasks)', () => {
    // Template rows should not be actual tasks in the JSON
    const p10Template = tasks.find(t => t.id === 'P10-TXX-SXX-MXX');
    const p11Template = tasks.find(t => t.id === 'P11-TXX-SXX-MXX');
    
    expect(p10Template).toBeUndefined();
    expect(p11Template).toBeUndefined();
  });
});