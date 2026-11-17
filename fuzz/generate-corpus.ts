// OTOMIX §5.3 · GAP-014 · P07-T02-S02-M01
// Deterministic corpus generator. No external state, no Math.random.
// Running twice yields the same 300 files + manifest.
import * as fs from 'node:fs';
import * as path from 'node:path';

export const SEED = 0x07000001;
export const COUNT = 300;
export const CLASSES = ['truncated', 'oversized', 'recursive', 'garbage'] as const;
export const FORMATS = ['wav', 'mp3', 'flac'] as const;
export const PER_CLASS = 75;

type Klass = typeof CLASSES[number];
type Format = typeof FORMATS[number];

export interface ManifestEntry { file: string; class: Klass; format: Format; bytes: number; }

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ri(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function minimalWav(): number[] {
  const p: number[] = [];
  const s = (str: string) => { for (let i = 0; i < str.length; i++) p.push(str.charCodeAt(i)); };
  const u32 = (v: number) => p.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
  const u16 = (v: number) => p.push(v & 0xff, (v >>> 8) & 0xff);
  s('RIFF'); u32(36 + 16); s('WAVE');
  s('fmt '); u32(16); u16(1); u16(1); u32(8000); u32(16000); u16(2); u16(16);
  s('data'); u32(16);
  for (let i = 0; i < 16; i++) p.push(0, 0);
  return p;
}

function minimalMp3(): number[] {
  const p: number[] = [];
  p.push(0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00); // ID3v2 header, size 0
  for (let i = 0; i < 100; i++) p.push(0xff, 0xfb, 0x90, 0x00); // MPEG frame syncs
  return p;
}

function minimalFlac(): number[] {
  const p: number[] = [];
  const u16BE = (v: number) => p.push((v >>> 8) & 0xff, v & 0xff);
  p.push(0x66, 0x4c, 0x61, 0x43); // fLaC
  p.push(0x80, 0x00, 0x00, 0x22); // STREAMINFO header (last, type 0, len 34)
  u16BE(4096); u16BE(4096);
  p.push(0, 0, 0, 0, 0, 0);
  // 20b rate (8000) | 3b ch-1 (0) | 5b bps-1 (15) | 36b samples (16)
  const combined = (BigInt(8000) << 44n) | (0n << 41n) | (15n << 36n) | 16n;
  for (let i = 0; i < 8; i++) p.push(Number((combined >> BigInt((7 - i) * 8)) & 0xffn));
  for (let i = 0; i < 16; i++) p.push(0); // MD5
  return p;
}

function base(fmt: Format): number[] {
  return fmt === 'wav' ? minimalWav() : fmt === 'mp3' ? minimalMp3() : minimalFlac();
}

function mutateTruncated(b: number[], rng: () => number): number[] {
  const cut = ri(rng, 1, b.length - 1);
  return b.slice(0, cut);
}

function mutateOversized(b: number[], fmt: Format, rng: () => number): number[] {
  const c = [...b];
  const huge = ri(rng, 0x70000000, 0x7fffffff);
  if (fmt === 'wav') {
    c[4] = huge & 0xff; c[5] = (huge >>> 8) & 0xff;
    c[6] = (huge >>> 16) & 0xff; c[7] = (huge >>> 24) & 0xff;
  } else if (fmt === 'mp3') {
    const syn = ri(rng, 0x0fffff00, 0x0fffffff);
    c[6] = (syn >> 21) & 0x7f; c[7] = (syn >> 14) & 0x7f;
    c[8] = (syn >> 7) & 0x7f; c[9] = syn & 0x7f;
  } else {
    c[5] = (huge >>> 16) & 0xff; c[6] = 0xff; c[7] = 0xff;
  }
  return c;
}

function mutateRecursive(b: number[], fmt: Format, rng: () => number): number[] {
  const extra: number[] = [];
  const pushU32LE = (v: number) => extra.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
  const pushStr = (str: string) => { for (let i = 0; i < str.length; i++) extra.push(str.charCodeAt(i)); };
  if (fmt === 'wav') {
    for (let i = 0; i < ri(rng, 1, 5); i++) {
      pushStr('LIST'); pushU32LE(8); pushStr('INFO'); pushU32LE(0);
    }
  } else if (fmt === 'mp3') {
    for (let i = 0; i < ri(rng, 1, 5); i++) {
      extra.push(0x49, 0x44, 0x33, 0x03, 0x00, 0x40, 0, 0, 0, 0); // ID3v2 w/ extended header
    }
  } else {
    extra.push(0x04, 0x00, 0x00, 0x0c); // Vorbis comment block, len 12
    pushU32LE(0); pushU32LE(1000); pushU32LE(0); // count=1000 far exceeds actual
  }
  return b.concat(extra);
}

function mutateGarbage(fmt: Format, rng: () => number): number[] {
  const size = ri(rng, 20, 500);
  const p: number[] = [];
  if (fmt === 'wav') p.push(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45);
  else if (fmt === 'mp3') p.push(0x49, 0x44, 0x33, 0x03, 0, 0, 0, 0, 0, 0);
  else p.push(0x66, 0x4c, 0x61, 0x43, 0x80, 0, 0, 0x22);
  while (p.length < size) p.push(ri(rng, 0, 255));
  return p;
}

export function generateCorpus(outDir: string): { manifest: ManifestEntry[]; totalBytes: number } {
  fs.mkdirSync(outDir, { recursive: true });
  const rng = mulberry32(SEED);
  const manifest: ManifestEntry[] = [];
  let totalBytes = 0;
  for (let i = 0; i < COUNT; i++) {
    const format = FORMATS[i % 3] as Format;
    const klass = CLASSES[Math.floor(i / PER_CLASS)] as Klass;
    const b = base(format);
    const mutated =
      klass === 'truncated' ? mutateTruncated(b, rng)
      : klass === 'oversized' ? mutateOversized(b, format, rng)
      : klass === 'recursive' ? mutateRecursive(b, format, rng)
      : mutateGarbage(format, rng);
    const filename = `fuzz-${String(i).padStart(3, '0')}-${klass}-${format}.bin`;
    fs.writeFileSync(path.join(outDir, filename), Buffer.from(mutated));
    manifest.push({ file: filename, class: klass, format, bytes: mutated.length });
    totalBytes += mutated.length;
  }
  fs.writeFileSync(path.join(outDir, '..', 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { manifest, totalBytes };
}

// CLI entry: run only when invoked as `tsx fuzz/generate-corpus.ts`.
const isMain = typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module;
if (isMain) {
  const outDir = path.resolve(__dirname, 'corpus');
  const { manifest, totalBytes } = generateCorpus(outDir);
  console.log(`Generated ${manifest.length} corpus files (${totalBytes} bytes)`);
  for (const k of CLASSES) {
    console.log(`  ${k}: ${manifest.filter((m) => m.class === k).length}`);
  }
}