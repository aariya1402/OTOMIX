import { describe, it, expect } from 'vitest';
import { ExportEncoder } from '../src/dsp/encoder';

describe('ExportEncoder', () => {
  const encoder = new ExportEncoder();
  const sampleRate = 44100;
  const buffer = new Float32Array(44100 * 5); // 5s silence
  // Fill with a sine wave for validity
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.sin(2 * Math.PI * 440 * (i / sampleRate));
  }

  it('encodes to WAV with a valid RIFF/WAVE header', async () => {
    const result = await encoder.encode(buffer, 'wav', sampleRate);
    const view = new DataView(result.buffer);
    
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    
    expect(riff).toBe('RIFF');
    expect(wave).toBe('WAVE');
    expect(view.getUint32(24, true)).toBe(sampleRate);
  });

  it('encodes to MP3 (stub)', async () => {
    const result = await encoder.encode(buffer, 'mp3', sampleRate);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toBe(0xFF); // Fake sync word from stub
  });

  it('encodes to FLAC (stub)', async () => {
    const result = await encoder.encode(buffer, 'flac', sampleRate);
    expect(result.length).toBeGreaterThan(0);
  });

  it('rejects empty buffer', async () => {
    await expect(encoder.encode(new Float32Array(0), 'wav', sampleRate)).rejects.toThrow();
  });

  it('rejects invalid sample rate', async () => {
    await expect(encoder.encode(buffer, 'wav', NaN)).rejects.toThrow();
  });
});