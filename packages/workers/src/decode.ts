// OTOMIX §5.2 · Mother §1 · GAP-014 · GAP-017
import { normalizeChannels, TARGET_SAMPLE_RATE } from '@otomix/core';

export type DecodeFormat = 'mp3' | 'wav' | 'flac' | 'unknown';

export interface DecodeValue {
  pcm: Float32Array;
  sampleRate: number;
  sha256: string;
}

export type DecodeResult =
  | { ok: true; value: DecodeValue }
  | { ok: false; error: 'INVALID_ARGUMENT' | 'DECODE_FAILED' | 'TIMEOUT' | 'OOM'; message: string };

interface RawDecoded {
  channelData: Float32Array[];
  sampleRate: number;
}

function asciiFromBytes(bytes: Uint8Array, off: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += String.fromCharCode(bytes[off + i] ?? 0);
  }
  return s;
}

function readFlacTotalSamples(bytes: Uint8Array): number {
  // STREAMINFO is the first metadata block, starting at file offset 8
  // (after 'fLaC' magic + 4-byte metadata block header).
  // byte 13 (low nibble) = high 4 bits of total_samples
  // bytes 14..17 = low 32 bits of total_samples
  // combined: 36-bit total_samples
  if (bytes.length < 26) return 0;
  const si = 8;
  const byte13 = bytes[si + 13] ?? 0;
  const hi4 = byte13 & 0x0f;
  const b14 = bytes[si + 14] ?? 0;
  const b15 = bytes[si + 15] ?? 0;
  const b16 = bytes[si + 16] ?? 0;
  const b17 = bytes[si + 17] ?? 0;
  const lo32 = (((b14 << 24) | (b15 << 16) | (b16 << 8) | b17) >>> 0);
  return hi4 * 0x100000000 + lo32;
}

function parseWav(bytes: Uint8Array): RawDecoded | null {
  if (bytes.length < 44) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const riff = asciiFromBytes(bytes, 0, 4);
  const wave = asciiFromBytes(bytes, 8, 4);
  if (riff !== 'RIFF' || wave !== 'WAVE') return null;

  let pos = 12;
  let audioFormat = 0, numChannels = 0, sampleRate = 0, bitsPerSample = 0;
  let dataOffset = -1, dataLen = 0;
  while (pos + 8 <= bytes.length) {
    const chunkId = asciiFromBytes(bytes, pos, 4);
    const chunkSize = dv.getUint32(pos + 4, true);
    const body = pos + 8;
    if (chunkId === 'fmt ') {
      audioFormat = dv.getUint16(body, true);
      numChannels = dv.getUint16(body + 2, true);
      sampleRate = dv.getUint32(body + 4, true);
      bitsPerSample = dv.getUint16(body + 14, true);
    } else if (chunkId === 'data') {
      dataOffset = body;
      dataLen = chunkSize;
      break;
    }
    pos = body + chunkSize + (chunkSize & 1);
  }
  if (dataOffset < 0 || numChannels === 0 || sampleRate === 0) return null;
  if (dataOffset + dataLen > bytes.length) dataLen = bytes.length - dataOffset;

  const bytesPerSample = bitsPerSample / 8;
  const frames = Math.floor(dataLen / (bytesPerSample * numChannels));
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channelData.push(new Float32Array(frames));

  if (audioFormat === 1 && bitsPerSample === 16) {
    for (let f = 0; f < frames; f++) {
      for (let c = 0; c < numChannels; c++) {
        const off = dataOffset + (f * numChannels + c) * 2;
        const ch = channelData[c];
        if (ch) ch[f] = dv.getInt16(off, true) / 32768;
      }
    }
  } else if (audioFormat === 3 && bitsPerSample === 32) {
    for (let f = 0; f < frames; f++) {
      for (let c = 0; c < numChannels; c++) {
        const off = dataOffset + (f * numChannels + c) * 4;
        const ch = channelData[c];
        if (ch) ch[f] = dv.getFloat32(off, true);
      }
    }
  } else {
    return null;
  }
  return { channelData, sampleRate };
}

async function decodeMp3(bytes: Uint8Array): Promise<RawDecoded | null> {
  try {
    const mod: any = await import('mpg123-decoder');
    const Ctor = mod.MPEGDecoder || mod.Mp3Decoder || mod.default;
    if (!Ctor) return null;
    const dec = new Ctor();
    if (dec.ready) await dec.ready;
    const fn = dec.decode || dec.decodeMp3 || dec.decodeMP3;
    if (!fn) return null;
    let res = fn.call(dec, bytes);
    if (res && typeof res.then === 'function') res = await res;
    if (dec.free) dec.free();
    if (!res || !res.channelData) return null;
    return { channelData: res.channelData as Float32Array[], sampleRate: res.sampleRate as number };
  } catch { return null; }
}

async function decodeFlac(bytes: Uint8Array): Promise<RawDecoded | null> {
  const declaredTotal = readFlacTotalSamples(bytes);
  const DEBUG = typeof process !== 'undefined' && (process as any)?.env?.OTOMIX_DEBUG_FLAC === '1';
  try {
    const mod: any = await import('@wasm-audio-decoders/flac');
    const Ctor = mod.FLACDecoder || mod.default;
    if (!Ctor) return null;
    const dec = new Ctor();
    if (dec.ready) await dec.ready;
    const fn = dec.decode || dec.decodeFlac || dec.decodeFLAC;
    if (!fn) return null;
    let res = fn.call(dec, bytes);
    if (res && typeof res.then === 'function') res = await res;
    if (dec.free) dec.free();
    if (!res) return null;

    if (DEBUG) {
      console.error('[FLAC] declaredTotal=', declaredTotal);
      console.error('[FLAC] res.channelData type=', typeof res.channelData, 'isArray=', Array.isArray(res.channelData));
      console.error('[FLAC] res.channelData.length=', res.channelData?.length);
      console.error('[FLAC] res.channelData[0].length=', res.channelData?.[0]?.length);
      console.error('[FLAC] res.sampleRate=', res.sampleRate);
    }

    const raw = res.channelData;
    if (!raw) return null;

    let channelData: Float32Array[];
    if (Array.isArray(raw)) {
      channelData = raw as Float32Array[];
    } else if (raw instanceof Float32Array) {
      channelData = [raw];
    } else if (typeof raw === 'object' && typeof (raw as any).length === 'number') {
      const arr = raw as any;
      const n = arr.length as number;
      const out: Float32Array[] = [];
      for (let i = 0; i < n; i++) {
        const el = arr[i];
        if (el instanceof Float32Array) out.push(el);
      }
      if (out.length === 0) return null;
      channelData = out;
    } else {
      return null;
    }

    if (DEBUG) console.error('[FLAC] normalized channels=', channelData.length, 'len0=', channelData[0]?.length);

    if (declaredTotal > 0) {
      // STREAMINFO.total_samples is authoritative. The WASM decoder may
      // return more (last-block padding) or fewer (dropped partial block)
      // samples. Adjust to exactly declaredTotal.
      channelData = channelData.map((ch) => {
        if (ch.length === declaredTotal) return ch;
        if (ch.length > declaredTotal) return ch.subarray(0, declaredTotal);
        // pad with silence
        const padded = new Float32Array(declaredTotal);
        padded.set(ch);
        return padded;
      });
      if (DEBUG) console.error('[FLAC] after adjust len0=', channelData[0]?.length, ' declaredTotal=', declaredTotal);
    }

    return { channelData, sampleRate: (res.sampleRate as number) ?? 48000 };
  } catch (err) {
    if (DEBUG) console.error('[FLAC] error=', err);
    return null;
  }
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const c: any = (globalThis as any).crypto;
  const hash = await c.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i] ?? 0).toString(16).padStart(2, '0');
  }
  return out;
}

export async function decodeAll(
  bytes: Uint8Array,
  format: DecodeFormat,
  _trace_id: string,
  _span_id: string,
): Promise<DecodeResult> {
  if (!bytes || bytes.length === 0) return { ok: false, error: 'INVALID_ARGUMENT', message: 'empty input' };

  let raw: RawDecoded | null = null;
  try {
    if (format === 'wav') raw = parseWav(bytes);
    else if (format === 'mp3') raw = await decodeMp3(bytes);
    else if (format === 'flac') raw = await decodeFlac(bytes);
    else return { ok: false, error: 'INVALID_ARGUMENT', message: `unsupported format: ${format}` };
  } catch (err) {
    return { ok: false, error: 'DECODE_FAILED', message: (err as Error)?.message ?? 'unknown' };
  }
  if (!raw) return { ok: false, error: 'DECODE_FAILED', message: `could not decode ${format}` };

  const pcm = normalizeChannels(raw.channelData, raw.sampleRate, true);
  const view = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const sha256 = await sha256Hex(view);
  return { ok: true, value: { pcm, sampleRate: TARGET_SAMPLE_RATE, sha256 } };
}