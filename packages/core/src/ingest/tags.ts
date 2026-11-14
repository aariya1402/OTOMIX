// OTOMIX §5.2 · Mother §1 · GAP-007 · GAP-014
// Pure tag parser. Extracts display hints. Never feeds analysis.
// Registry safety: `DisplayMetadata` is a distinct type from
// `RegistryFields`; the two must never be spread together.
import type { DetectedFormat } from './sniff';

export interface DisplayMetadata {
  title?: string;
  bpm?: number;      // DISPLAY HINT ONLY — never used for analysis
  key?: string;      // DISPLAY HINT ONLY — never used for analysis
  artist?: string;   // PII
  album?: string;    // PII
  comment?: string;  // PII
}

export interface TagsResult {
  displayMetadata: DisplayMetadata;
  hasPii: boolean;
}

function asciiAt(bytes: Uint8Array, off: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[off + i] ?? 0);
  return s;
}

function readU32BE(bytes: Uint8Array, off: number): number {
  return (((bytes[off] ?? 0) << 24) | ((bytes[off + 1] ?? 0) << 16) | ((bytes[off + 2] ?? 0) << 8) | (bytes[off + 3] ?? 0)) >>> 0;
}

function readU32LE(bytes: Uint8Array, off: number): number {
  return (((bytes[off + 3] ?? 0) << 24) | ((bytes[off + 2] ?? 0) << 16) | ((bytes[off + 1] ?? 0) << 8) | (bytes[off] ?? 0)) >>> 0;
}

function decodeSyncsafe(bytes: Uint8Array, off: number): number {
  return (((bytes[off] ?? 0) & 0x7f) << 21) | (((bytes[off + 1] ?? 0) & 0x7f) << 14) | (((bytes[off + 2] ?? 0) & 0x7f) << 7) | ((bytes[off + 3] ?? 0) & 0x7f);
}

function stripTrailingNul(s: string): string {
  let i = s.length;
  while (i > 0 && (s.charCodeAt(i - 1) === 0 || s.charCodeAt(i - 1) === 32)) i--;
  return s.slice(0, i);
}

// ---- WAV: LIST-INFO ----
function parseWavListInfo(bytes: Uint8Array, display: DisplayMetadata): boolean {
  if (bytes.length < 12) return false;
  if (asciiAt(bytes, 0, 4) !== 'RIFF' || asciiAt(bytes, 8, 4) !== 'WAVE') return false;
  let pos = 12;
  while (pos + 8 <= bytes.length) {
    const id = asciiAt(bytes, pos, 4);
    const size = readU32LE(bytes, pos + 4);
    const body = pos + 8;
    if (id === 'LIST' && body + 4 <= bytes.length && asciiAt(bytes, body, 4) === 'INFO') {
      const end = Math.min(body + size, bytes.length);
      let p = body + 4;
      while (p + 8 <= end) {
        const sid = asciiAt(bytes, p, 4);
        const ssize = readU32LE(bytes, p + 4);
        const sbody = p + 8;
        const sdata = asciiAt(bytes, sbody, Math.min(ssize, end - sbody));
        const val = stripTrailingNul(sdata);
        if (val) {
          if (sid === 'INAM') display.title = val;
          else if (sid === 'IART') display.artist = val;
          else if (sid === 'IPRD') display.album = val;
          else if (sid === 'ICMT') display.comment = val;
          else if (sid === 'ICBP') { const n = Number(val); if (Number.isFinite(n)) display.bpm = n; }
          else if (sid === 'IKEY') display.key = val;  // WAV chunk IDs are exactly 4 bytes
        }
        p = sbody + ssize + (ssize & 1);
      }
      return true;
    }
    pos = body + size + (size & 1);
  }
  return false;
}

// ---- MP3: ID3v2 ----
function parseMp3Id3v2(bytes: Uint8Array, display: DisplayMetadata): boolean {
  if (bytes.length < 10 || asciiAt(bytes, 0, 3) !== 'ID3') return false;
  const size = decodeSyncsafe(bytes, 6);
  const end = Math.min(10 + size, bytes.length);
  let pos = 10;
  while (pos + 10 <= end) {
    const frameId = asciiAt(bytes, pos, 4);
    if (!/^[A-Z0-9]{4}$/.test(frameId)) break;
    const frameSize = readU32BE(bytes, pos + 4);
    const frameBody = pos + 10;
    if (frameBody + frameSize > end) break;
    if (frameId === 'TIT2' || frameId === 'TPE1' || frameId === 'TALB' || frameId === 'TBPM' || frameId === 'TKEY') {
      let val = '';
      for (let i = frameBody + 1; i < frameBody + frameSize; i++) {
        const b = bytes[i] ?? 0;
        if (b === 0) break;
        val += String.fromCharCode(b);
      }
      val = stripTrailingNul(val);
      if (val) {
        if (frameId === 'TIT2') display.title = val;
        else if (frameId === 'TPE1') display.artist = val;
        else if (frameId === 'TALB') display.album = val;
        else if (frameId === 'TBPM') { const n = Number(val); if (Number.isFinite(n)) display.bpm = n; }
        else if (frameId === 'TKEY') display.key = val;
      }
    }
    pos = frameBody + frameSize;
  }
  return true;
}

// ---- MP3: ID3v1 (last 128 bytes) — only fills missing fields ----
function parseMp3Id3v1(bytes: Uint8Array, display: DisplayMetadata): boolean {
  if (bytes.length < 128) return false;
  const off = bytes.length - 128;
  if (asciiAt(bytes, off, 3) !== 'TAG') return false;
  const title = stripTrailingNul(asciiAt(bytes, off + 3, 30));
  const artist = stripTrailingNul(asciiAt(bytes, off + 33, 30));
  const album = stripTrailingNul(asciiAt(bytes, off + 63, 30));
  if (title && !display.title) display.title = title;
  if (artist && !display.artist) display.artist = artist;
  if (album && !display.album) display.album = album;
  return true;
}

// ---- FLAC: Vorbis Comment (block type 4) ----
function parseFlacVorbis(bytes: Uint8Array, display: DisplayMetadata): boolean {
  if (bytes.length < 4 || asciiAt(bytes, 0, 4) !== 'fLaC') return false;
  let pos = 4;
  while (pos + 4 <= bytes.length) {
    const header = bytes[pos] ?? 0;
    const isLast = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const len = (((bytes[pos + 1] ?? 0) << 16) | ((bytes[pos + 2] ?? 0) << 8) | (bytes[pos + 3] ?? 0)) >>> 0;
    const body = pos + 4;
    if (body + len > bytes.length) break;
    if (type === 4) {
      const vendorLen = readU32LE(bytes, body);
      let p = body + 4 + vendorLen;
      if (p + 4 > body + len) break;
      const count = readU32LE(bytes, p);
      p += 4;
      for (let i = 0; i < count && p + 4 <= body + len; i++) {
        const elen = readU32LE(bytes, p);
        const ebody = p + 4;
        if (ebody + elen > body + len) break;
        const entry = asciiAt(bytes, ebody, elen);
        const eq = entry.indexOf('=');
        if (eq > 0) {
          const k = entry.slice(0, eq).toUpperCase();
          const v = stripTrailingNul(entry.slice(eq + 1));
          if (v) {
            if (k === 'TITLE') display.title = v;
            else if (k === 'ARTIST') display.artist = v;
            else if (k === 'ALBUM') display.album = v;
            else if (k === 'COMMENT') display.comment = v;
            else if (k === 'BPM') { const n = Number(v); if (Number.isFinite(n)) display.bpm = n; }
            else if (k === 'KEY') display.key = v;
          }
        }
        p = ebody + elen;
      }
      return true;
    }
    pos = body + len;
    if (isLast) break;
  }
  return false;
}

export function extractTags(bytes: Uint8Array, format: DetectedFormat): TagsResult {
  const display: DisplayMetadata = {};
  if (!bytes || bytes.length === 0) return { displayMetadata: display, hasPii: false };

  if (format === 'wav') {
    parseWavListInfo(bytes, display);
  } else if (format === 'mp3') {
    parseMp3Id3v2(bytes, display);
    parseMp3Id3v1(bytes, display); // only fills missing fields
  } else if (format === 'flac') {
    parseFlacVorbis(bytes, display);
  }

  const hasPii =
    display.artist !== undefined ||
    display.album !== undefined ||
    display.comment !== undefined;

  return { displayMetadata: display, hasPii };
}