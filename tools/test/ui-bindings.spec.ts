import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('GATE0-DOC-M03 UI bindings', () => {
  it('documents the P08 UI binding matrix', () => {
    const root = path.resolve(__dirname, '..', '..');
    const binding = fs.readFileSync(path.join(root, 'Docs/FEATURES/OTOMIX_UI_Bindings.md'), 'utf8');
    for (const id of ['P08-T01', 'P08-T02', 'P08-T03', 'P08-T04', 'P08-T05', 'P08-T06']) {
      expect(binding).toContain(id);
    }
  });
});
