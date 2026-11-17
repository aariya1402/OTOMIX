// OTOMIX §5.2 · Mother §1 · GAP-014
import { describe, it, expect } from 'vitest';
import { sniffForLocal } from '../src/ingest/sniff';

function mp3Fixture(): Uint8Array {
  return new Uint8Array([
    0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xff, 0xfb, 0x90, 0x00,
  ]);
}

function flacFixture(): Uint8Array {
  return new Uint8Array([0x66, 0x4c, 0x61, 0x43, 0x00, 0x00, 0x00, 0x22]);
}

function wavFixture(): Uint8Array {
  return new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
    0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
  ]);
}

function randomFixture(): Uint8Array {
  return new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
}

describe('sniffForLocal — local wrapper (P07-T01-S01-M01)', () => {
  it('MP3 named .wav -> mp3, mismatch logged via injected warn', () => {
    const warnings: any[] = [];
    const r = sniffForLocal(mp3Fixture(), 'track.wav', (rec) => warnings.push(rec));
    expect(r.format).toBe('mp3');
    expect(r.mismatch).toBe(true);
    expect(warnings.length).toBe(1);
    expect(warnings[0].event).toBe('ingest.ext_mismatch');
    expect(warnings[0].detectedFormat).toBe('mp3');
  });

  it('FLAC named .mp3 -> flac, mismatch logged', () => {
    const warnings: any[] = [];
    const r = sniffForLocal(flacFixture(), 'track.mp3', (rec) => warnings.push(rec));
    expect(r.format).toBe('flac');
    expect(warnings.length).toBe(1);
  });

  it('WAV named .flac -> wav, mismatch logged', () => {
    const warnings: any[] = [];
    const r = sniffForLocal(wavFixture(), 'track.flac', (rec) => warnings.push(rec));
    expect(r.format).toBe('wav');
    expect(warnings.length).toBe(1);
  });

  it('random bytes -> unknown, no warning', () => {
    const warnings: any[] = [];
    const r = sniffForLocal(randomFixture(), 'track.bin', (rec) => warnings.push(rec));
    expect(r.format).toBe('unknown');
    expect(r.mismatch).toBe(false);
    expect(warnings.length).toBe(0);
  });
});