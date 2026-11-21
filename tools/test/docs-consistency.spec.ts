import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('P08 decision consistency', () => {
  it('uses 60/30/10 recommendation weights and a 2-20 percent tempo UI range', () => {
    const root = path.resolve(__dirname, '..', '..');
    const score = fs.readFileSync(path.join(root, 'packages/ui/src/mixplan/score.ts'), 'utf8');
    expect(score).toContain('mixability: 0.60');
    expect(score).toContain('camelot: 0.30');
    expect(score).toContain('tempo: 0.10');
    expect(score).toContain('MIN_TEMPO_DELTA_PERCENT = 2');
    expect(score).toContain('MAX_TEMPO_DELTA_PERCENT = 20');
  });
});
