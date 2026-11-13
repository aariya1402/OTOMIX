import { describe, it, expect } from 'vitest';
import { normalizeInput, type AudioBufferInput } from '../src/normalize';

function makeSine(sampleRate: number, durationSeconds: number, frequencyHz: number, amplitude: number): Float32Array {
  const length = Math.round(sampleRate * durationSeconds);
  const buf = new Float32Array(length);
  const omega = (2 * Math.PI * frequencyHz) / sampleRate;
  for (let i = 0; i < length; i++) buf[i] = amplitude * Math.sin(omega * i);
  return buf;
}

function makeInput(channels: Float32Array[], sampleRate: number): AudioBufferInput {
  return {
    sampleRate,
    numberOfChannels: channels.length,
    length: channels.length > 0 ? channels[0].length : 0,
    getChannelData: (c: number) => channels[c]!,
  };
}

describe('normalizeInput (Stereo default + forceMono)', () => {
  it('T1: 48 kHz stereo -> 2 channels', () => {
    const L = makeSine(48000, 2, 1000, 1.0);
    const R = makeSine(48000, 2, 1000, 0.8);
    const result = normalizeInput(makeInput([L, R], 48000), false);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBe(2);
    expect(result.value[0].length).toBe(88200);
    expect(result.value[1].length).toBe(88200);
  });

  it('T2: forceMono=true -> 1 channel', () => {
    const L = makeSine(48000, 2, 1000, 1.0);
    const R = makeSine(48000, 2, 1000, 0.8);
    const result = normalizeInput(makeInput([L, R], 48000), true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBe(1);
    expect(result.value[0].length).toBe(88200);
  });

  it('T3: 44.1 kHz stereo -> bypass resample', () => {
    const L = makeSine(44100, 1, 1000, 1.0);
    const R = makeSine(44100, 1, 1000, 0.8);
    const result = normalizeInput(makeInput([L, R], 44100), false);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBe(2);
    expect(result.value[0].length).toBe(44100);
  });

  it('T4: numberOfChannels === 0 -> INVALID_ARGUMENT', () => {
    const result = normalizeInput(makeInput([], 44100));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('INVALID_ARGUMENT');
  });

  it('T5: length === 0 -> ok with empty array', () => {
    const empty = new Float32Array(0);
    const result = normalizeInput(makeInput([empty, empty], 44100));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBe(0);
  });

  it('T6: fresh buffers, no aliasing', () => {
    const L = makeSine(48000, 2, 1000, 1.0);
    const R = makeSine(48000, 2, 1000, 0.8);
    const input = makeInput([L, R], 48000);
    const first = normalizeInput(input, false);
    const second = normalizeInput(input, false);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.value[0].buffer).not.toBe(second.value[0].buffer);
    expect(first.value[0].buffer).not.toBe(L.buffer);
  });
});