// OTOMIX §5.2 · Mother §1 · GAP-014
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { decodeAll } from '../src/decode';

const FX = path.resolve(__dirname, 'fixtures');
const TOLERANCE = { wav: 1, flac: 2, mp3: 2304 };

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(fs.readFileSync(path.join(FX, name)));
}

describe('decodeAll (P07-T01-S03-M01)', () => {
  it('decodes 5s 48kHz stereo WAV -> 44.1kHz mono, 220500 samples ±1', async () => {
    const bytes = loadFixture('5s-48khz-stereo.wav');
    const r = await decodeAll(bytes, 'wav', 't', 's');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.sampleRate).toBe(44100);
    expect(Math.abs(r.value.pcm.length - 220500)).toBeLessThanOrEqual(TOLERANCE.wav);
    expect(r.value.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('decodes 5s 48kHz stereo FLAC -> 44.1kHz mono, 220500 samples ±2', async () => {
    const bytes = loadFixture('5s-48khz-stereo.flac');
    const r = await decodeAll(bytes, 'flac', 't', 's');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.sampleRate).toBe(44100);
    expect(Math.abs(r.value.pcm.length - 220500)).toBeLessThanOrEqual(TOLERANCE.flac);
    expect(r.value.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('decodes 5s 48kHz stereo MP3 -> 44.1kHz mono, 220500 samples ±2304', async () => {
    const bytes = loadFixture('5s-48khz-stereo.mp3');
    const r = await decodeAll(bytes, 'mp3', 't', 's');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.sampleRate).toBe(44100);
    expect(Math.abs(r.value.pcm.length - 220500)).toBeLessThanOrEqual(TOLERANCE.mp3);
    expect(r.value.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects empty input', async () => {
    const r = await decodeAll(new Uint8Array(0), 'wav', 't', 's');
    expect(r.ok).toBe(false);
  });

  it('rejects unknown format', async () => {
    const r = await decodeAll(new Uint8Array([1, 2, 3]), 'unknown', 't', 's');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('INVALID_ARGUMENT');
  });
});