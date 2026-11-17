// P03-T04-S02-M01 (CONFLICT-004) — BPM matching via chopping, no pitch shift.
// The plan.md decision is: chopping is used instead of pitch shifting, so the
// ±0.05 semitone acceptance (§10.7 item 3) applies only to post-transition
// realignment and does NOT apply to Runtime Drift Compensation. This test
// verifies the implementation follows the decision (source grep, no audio).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const sliceSrc = readFileSync(resolve(here, '..', 'src', 'chop', 'slice.ts'), 'utf-8');

describe('P03-T04-S02-M01: BPM matching via chopping (no pitch shift)', () => {
  it('does not assign playbackRate (no pitch shift)', () => {
    expect(sliceSrc).not.toMatch(/\.playbackRate\s*=/);
  });

  it('does not use detune (no pitch shift)', () => {
    expect(sliceSrc).not.toMatch(/\bdetune\b/);
  });

  it('does not call a pitch-shift API', () => {
    expect(sliceSrc).not.toMatch(/\bpitchShift\b|setPlaybackRate|preservesPitch\s*=\s*false/i);
  });
});