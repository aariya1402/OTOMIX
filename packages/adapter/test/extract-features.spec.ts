import { describe, it, expect } from 'vitest';
import { extractFeatures, SUPPORTED_FEATURES } from '../src/extract-features';

function makeFullStub(): Record<string, unknown> {
  const stub: Record<string, unknown> = {};
  for (const name of SUPPORTED_FEATURES) {
    // Assign a stub value; the type doesn't matter for key-presence checks.
    stub[name] = typeof name === 'string' ? 0 : null;
  }
  // Override a few with realistic shapes to prove values are passed through:
  stub['bpm'] = 124;
  stub['bpm_histogram'] = [120, 124, 128];
  stub['beats_position'] = [0.25, 0.75, 1.25];
  stub['chords'] = { strength: 0.8, histogram: [], changes_rate: 0.1, key: 'Am' };
  stub['spectral_energyband'] = { low: 0.5, middle: 0.3, high: 0.2 };
  stub['mfcc'] = [[1, 2, 3]];
  return stub;
}

describe('extractFeatures', () => {
  it('T1: extracts all supported features from a complete stub', () => {
    const stub = makeFullStub();
    const out = extractFeatures(stub);

    // Every supported feature name must be present in the output.
    for (const name of SUPPORTED_FEATURES) {
      expect(out).toHaveProperty(name);
    }

    // Spot-check that values are passed through unchanged:
    expect(out.bpm).toBe(124);
    expect(out.bpm_histogram).toEqual([120, 124, 128]);
    expect(out.beats_position).toEqual([0.25, 0.75, 1.25]);
    expect(out.chords).toEqual({ strength: 0.8, histogram: [], changes_rate: 0.1, key: 'Am' });
    expect(out.spectral_energyband).toEqual({ low: 0.5, middle: 0.3, high: 0.2 });
  });

  it('T2: TensorFlow-only keys are ignored (D11)', () => {
    // Raw input that has TF keys (as if from a future final-track pipeline).
    // The extractor must NOT expose them, because they are deferred to a
    // separate task per owner decision D11.
    const stub = makeFullStub();
    stub['genre'] = 'House';
    stub['mood'] = 'happy';
    stub['voice_instrumental'] = { voice: 0.1, instrumental: 0.9 };

    const out = extractFeatures(stub);

    // TF keys must NOT appear in the output.
    expect(out).not.toHaveProperty('genre');
    expect(out).not.toHaveProperty('mood');
    expect(out).not.toHaveProperty('voice_instrumental');
  });

  it('T3: partial input yields a partial ExtractedFeatures', () => {
    const out = extractFeatures({ bpm: 90, key_temperley: 1 });
    expect(out.bpm).toBe(90);
    expect(out.key_temperley).toBe(1);
    expect(out).not.toHaveProperty('danceability');
    expect(out).not.toHaveProperty('mfcc');
  });
});