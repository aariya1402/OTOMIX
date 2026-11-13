// OTOMIX §5.2 · Mother §1 · GAP-014
// Pure format detection by magic bytes. No I/O, no logging, no path.extname.
// Shared by the cloud wrapper (packages/gateway) and the local wrapper
// (packages/adapter). GAP-014 divergence lives in the wrappers, not here.

export type DetectedFormat = 'mp3' | 'wav' | 'flac' | 'unknown';

function matchesAt(bytes: Uint8Array, offset: number, pattern: readonly number[]): boolean {
  if (bytes.length < offset + pattern.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (bytes[offset + i] !== pattern[i]) return false;
  }
  return true;
}

const MAGIC_ID3: readonly number[] = [0x49, 0x44, 0x33]; // 'ID3'
const MAGIC_RIFF: readonly number[] = [0x52, 0x49, 0x46, 0x46]; // 'RIFF'
const MAGIC_WAVE: readonly number[] = [0x57, 0x41, 0x56, 0x45]; // 'WAVE'
const MAGIC_FLAC: readonly number[] = [0x66, 0x4c, 0x61, 0x43]; // 'fLaC'

export function sniffContainer(bytes: Uint8Array): DetectedFormat {
  if (!bytes || bytes.length < 4) return 'unknown';

  // FLAC: 'fLaC' at offset 0
  if (matchesAt(bytes, 0, MAGIC_FLAC)) return 'flac';

  // WAV: 'RIFF' at 0 AND 'WAVE' at 8
  if (matchesAt(bytes, 0, MAGIC_RIFF) && matchesAt(bytes, 8, MAGIC_WAVE)) return 'wav';

  // MP3 with ID3v2 header
  if (matchesAt(bytes, 0, MAGIC_ID3)) return 'mp3';

  // MP3 raw MPEG frame sync: 11 bits set (0xFF 0xE0 mask)
  if (bytes.length >= 2 && bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0) return 'mp3';

  return 'unknown';
}