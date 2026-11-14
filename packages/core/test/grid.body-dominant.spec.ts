// OTOMIX 3.2 - Mother 2.2
import { describe, it, expect } from 'vitest';
import { classifyBodyDominance } from '../src/grid/body-dominant';

describe('classifyBodyDominance (P03-T02-S01-M02)', () => {
  it('returns bodyDominant=true when body power > attack power', () => {
    const attack = new Float32Array([0.1, 0.1, 0.1]);
    const body = new Float32Array([0.5, 0.5, 0.5]);
    const r = classifyBodyDominance(attack, body);
    expect(r.bodyDominant).toBe(true);
    expect(r.bodyPower).toBeGreaterThan(r.attackPower);
  });

  it('returns bodyDominant=false when attack power >= body power', () => {
    const attack = new Float32Array([0.5, 0.5, 0.5]);
    const body = new Float32Array([0.1, 0.1, 0.1]);
    const r = classifyBodyDominance(attack, body);
    expect(r.bodyDominant).toBe(false);
  });

  it('returns bodyDominant=false when equal power', () => {
    const attack = new Float32Array([0.2, 0.2, 0.2]);
    const body = new Float32Array([0.2, 0.2, 0.2]);
    const r = classifyBodyDominance(attack, body);
    expect(r.bodyDominant).toBe(false);
  });

  it('returns bodyDominant=false for empty envelopes', () => {
    const r = classifyBodyDominance(new Float32Array(), new Float32Array());
    expect(r.bodyDominant).toBe(false);
  });
});