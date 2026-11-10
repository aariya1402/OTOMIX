// OTOMIX §3.4 · Mother §2.4
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyKick, KickEnvelope } from '../src/anchor/classify';
import * as pearsonModule from '../src/anchor/pearson';

vi.mock('../src/anchor/pearson', () => ({
  pearsonCorrelation: vi.fn(),
}));

const mockPearson = vi.mocked(pearsonModule.pearsonCorrelation);

describe('classifyKick', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function makeEnvelopes(candidatePeak: number, refPeak: number): { candidate: KickEnvelope, ref: KickEnvelope } {
    return {
      candidate: new Float32Array([candidatePeak]),
      ref: new Float32Array([refPeak])
    };
  }

  it('returns ON_BEAT when r=0.85 and variance=0.15 (boundary)', () => {
    const { candidate, ref } = makeEnvelopes(11.5, 10); // var = 0.15
    mockPearson.mockReturnValue({ r: 0.85, varianceZero: false });
    expect(classifyKick(candidate, [ref])).toBe('ON_BEAT');
  });

  it('returns OFF_BEAT when r=0.8499 and variance=0.15', () => {
    const { candidate, ref } = makeEnvelopes(11.5, 10);
    mockPearson.mockReturnValue({ r: 0.8499, varianceZero: false });
    expect(classifyKick(candidate, [ref])).toBe('OFF_BEAT');
  });

  it('returns OFF_BEAT when r=0.90 and variance=0.1501', () => {
    const { candidate, ref } = makeEnvelopes(11.501, 10);
    mockPearson.mockReturnValue({ r: 0.90, varianceZero: false });
    expect(classifyKick(candidate, [ref])).toBe('OFF_BEAT');
  });

  it('returns ON_BEAT when both pass', () => {
    const { candidate, ref } = makeEnvelopes(11, 10); // var = 0.10
    mockPearson.mockReturnValue({ r: 0.90, varianceZero: false });
    expect(classifyKick(candidate, [ref])).toBe('ON_BEAT');
  });

  it('returns OFF_BEAT when both fail', () => {
    const { candidate, ref } = makeEnvelopes(11.501, 10);
    mockPearson.mockReturnValue({ r: 0.8499, varianceZero: false });
    expect(classifyKick(candidate, [ref])).toBe('OFF_BEAT');
  });

  it('returns OFF_BEAT for empty refs', () => {
    const { candidate } = makeEnvelopes(10, 10);
    expect(classifyKick(candidate, [])).toBe('OFF_BEAT');
  });

  it('returns OFF_BEAT if ANY reference fails', () => {
    const { candidate, ref } = makeEnvelopes(10, 10);
    mockPearson
      .mockReturnValueOnce({ r: 0.90, varianceZero: false })
      .mockReturnValueOnce({ r: 0.80, varianceZero: false });
    expect(classifyKick(candidate, [ref, ref])).toBe('OFF_BEAT');
  });

  it('returns OFF_BEAT if varianceZero is true', () => {
    const { candidate, ref } = makeEnvelopes(10, 10);
    mockPearson.mockReturnValue({ r: 0.90, varianceZero: true });
    expect(classifyKick(candidate, [ref])).toBe('OFF_BEAT');
  });
});