import { describe, it, expect } from 'vitest';
import { validateAnalysisEngineRequest, validateAnalysisEngineResponse } from '../src/engine-api';

const validRequest = {
  pcm_buffer: 'AAAAAA==', // 4 bytes of zeros in base64
  sample_rate: 44100,
  channels: 2,
  length: 1024,
  track_id: '550e8400-e29b-41d4-a716-446655440000',
  requested_features: ['bpm', 'key_temperley'],
};

describe('Analysis Engine API Contract', () => {
  it('T1: valid request passes', () => {
    const r = validateAnalysisEngineRequest(validRequest);
    expect(r.ok).toBe(true);
  });

  it('T2: missing pcm_buffer fails', () => {
    const { pcm_buffer, ...invalid } = validRequest;
    const r = validateAnalysisEngineRequest(invalid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('INVALID_ARGUMENT');
  });

  it('T3: valid success response passes', () => {
    const r = validateAnalysisEngineResponse({
      status: 'success',
      features: { bpm: 120, key: '8A' },
    });
    expect(r.ok).toBe(true);
  });

  it('T4: invalid response (status success but missing features) fails', () => {
    const r = validateAnalysisEngineResponse({
      status: 'success',
    });
    expect(r.ok).toBe(false);
  });
});