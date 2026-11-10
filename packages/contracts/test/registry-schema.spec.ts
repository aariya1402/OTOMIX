// OTOMIX §9.6; §4.2 · Mother Add. §1–§2; §3.2
import { describe, it, expect } from 'vitest';
import { validateRegistry } from '../src/validate';

const validFixture = {
  schema_version: '1.2.0',
  track_id: '550e8400-e29b-41d4-a716-446655440000',
  bpm: 120.0,
  key: '8A',
  grid: {
    bpm_seed: 120.0,
    t0_seconds: 0.0,
    delta_phi_seconds: 0.0,
    groove_mode: 'straight',
    groove_delta: 0.1,
    pre_kick_beats: 0
  },
  energy: {
    rhythm: 0.5,
    dynamics: 0.5,
    loudness: 0.5,
    spectral: 0.5,
    scalar: 0.5,
    stars: 3
  },
  mixability: {
    score: 0.7,
    e_kick: 0.8,
    c_bass: 0.6,
    s_tempo: 0.9,
    v_tune: 0.5,
    class: 'mixable'
  },
  vocal_map: {
    threshold: 0.65,
    smoothing_ms: 1000,
    frames: [
      { t: 0.0, p: 0.1, v: 0 },
      { t: 1.0, p: 0.9, v: 1 }
    ]
  },
  interpolated_fields: [],
  used_rms_fallback: false
};

const invalidBpmFixture = {
  ...validFixture,
  bpm: 59.9 // below minimum 60.0
};

const invalidVocalThresholdFixture = {
  ...validFixture,
  vocal_map: {
    ...validFixture.vocal_map,
    threshold: 0.6 // must be exactly 0.65 (const)
  }
};

describe('Feature Registry Schema Validation', () => {
  it('accepts a valid registry', () => {
    const result = validateRegistry(validFixture);
    expect(result.ok).toBe(true);
  });

  it('rejects bpm 59.9 (below 60.0 minimum)', () => {
    const result = validateRegistry(invalidBpmFixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects vocal_map.threshold 0.6 (const requires 0.65)', () => {
    const result = validateRegistry(invalidVocalThresholdFixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });
});
