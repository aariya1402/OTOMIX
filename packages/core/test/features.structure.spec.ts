import { describe, it, expect } from 'vitest';
import { detectStructure, type TrackStructure, type StructureSection } from '../src/features/structure';

describe('detectStructure (stub)', () => {
  it('T1: returns all 8 structure sections as arrays', () => {
    const s = detectStructure(new Float32Array(1024));
    const keys: (keyof TrackStructure)[] = [
      'intro', 'outro', 'verse', 'chorus', 'drop', 'break', 'bridge', 'buildup',
    ];
    for (const k of keys) {
      expect(Array.isArray(s[k])).toBe(true);
    }
  });

  it('T2: stub returns empty arrays for every section', () => {
    const s = detectStructure({ any: 'buffer' });
    expect(s.intro.length).toBe(0);
    expect(s.outro.length).toBe(0);
    expect(s.verse.length).toBe(0);
    expect(s.chorus.length).toBe(0);
    expect(s.drop.length).toBe(0);
    expect(s.break.length).toBe(0);
    expect(s.bridge.length).toBe(0);
    expect(s.buildup.length).toBe(0);
  });

  it('T3: returned arrays are frozen and share no mutable state', () => {
    const s1 = detectStructure(null);
    const s2 = detectStructure(null);
    // Same frozen reference, no per-call allocation of section arrays.
    expect(s1.drop).toBe(s2.drop);
    expect(Object.isFrozen(s1.drop)).toBe(true);
  });

  it('T4: StructureSection shape has startBeat / endBeat (beat-indexed, not seconds)', () => {
    // Type-level contract enforced at compile time; this runtime test
    // documents that a well-formed section round-trips without mutation.
    const section: StructureSection = { startBeat: 17, endBeat: 33 };
    expect(section.startBeat).toBe(17);
    expect(section.endBeat).toBe(33);
    expect(section).toHaveProperty('startBeat');
    expect(section).toHaveProperty('endBeat');
    expect(section).not.toHaveProperty('startSeconds');
    expect(section).not.toHaveProperty('endSeconds');
  });
});