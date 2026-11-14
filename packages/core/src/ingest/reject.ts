// OTOMIX §5.3 · Mother §1 · GAP-014
// Pure classification of decode failures. No I/O, no logging. Cloud
// wrapper in gateway/src/ingest/reject.ts consumes this. GAP-014:
// cloud-only; the local UI classifies on its own because it never
// enters the retry queue.
export type RejectFormat = 'mp3' | 'wav' | 'flac';

export type RejectReason =
  | 'TRUNCATED_HEADER'
  | 'INVALID_FRAME_SYNC'
  | 'BAD_STREAMINFO'
  | 'UNKNOWN_PARSE_FAILURE';

export type RejectResult =
  | { ok: true }
  | {
      ok: false;
      error: 'INVALID_ARGUMENT';
      message: string;
      reason: RejectReason;
      retryable: false;
    };

function asciiAt(bytes: Uint8Array, off: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[off + i] ?? 0);
  return s;
}

function classifyWav(bytes: Uint8Array): RejectReason {
  if (bytes.length < 44) return 'TRUNCATED_HEADER';
  if (asciiAt(bytes, 0, 4) !== 'RIFF' || asciiAt(bytes, 8, 4) !== 'WAVE') {
    return 'TRUNCATED_HEADER';
  }
  // Look for a `data` chunk. If absent -> truncated.
  let pos = 12;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (pos + 8 <= bytes.length) {
    const id = asciiAt(bytes, pos, 4);
    const size = dv.getUint32(pos + 4, true);
    if (id === 'data') return bytes.length - (pos + 8) < size ? 'TRUNCATED_HEADER' : 'UNKNOWN_PARSE_FAILURE';
    pos += 8 + size + (size & 1);
  }
  return 'TRUNCATED_HEADER';
}

function classifyMp3(bytes: Uint8Array): RejectReason {
  if (bytes.length >= 3 && asciiAt(bytes, 0, 3) === 'ID3') {
    // Skip the ID3 tag header (10 bytes) and look for a frame sync afterwards.
    const tagSize = ((bytes[6] ?? 0) << 21) | ((bytes[7] ?? 0) << 14) | ((bytes[8] ?? 0) << 7) | (bytes[9] ?? 0);
    const frameStart = 10 + tagSize;
    if (frameStart + 2 > bytes.length) return 'TRUNCATED_HEADER';
    return checkMpegSync(bytes, frameStart);
  }
  return checkMpegSync(bytes, 0);
}

function checkMpegSync(bytes: Uint8Array, start: number): RejectReason {
  // Walk up to 4KB looking for a valid frame sync: 0xFF 0xE0 mask.
  const limit = Math.min(bytes.length - 1, start + 4096);
  for (let i = start; i < limit; i++) {
    if (bytes[i] === 0xff && ((bytes[i + 1] ?? 0) & 0xe0) === 0xe0) {
      // Reject reserved layer (00) and reserved bitrate (1111).
      const b1 = bytes[i + 1] ?? 0;
      const layer = (b1 >> 1) & 0x03;
      if (layer !== 0) return 'UNKNOWN_PARSE_FAILURE';
    }
  }
  return 'INVALID_FRAME_SYNC';
}

function classifyFlac(bytes: Uint8Array): RejectReason {
  if (bytes.length < 4) return 'TRUNCATED_HEADER';
  if (asciiAt(bytes, 0, 4) !== 'fLaC') return 'TRUNCATED_HEADER';
  // First metadata block header at offset 4, 4 bytes: 1 bit last, 7 bits type,
  // 24 bits length. Type 0 = STREAMINFO. Length must be exactly 34.
  if (bytes.length < 8 + 34) return 'TRUNCATED_HEADER';
  const blockType = (bytes[4] ?? 0) & 0x7f;
  const blockLen = ((bytes[5] ?? 0) << 16) | ((bytes[6] ?? 0) << 8) | (bytes[7] ?? 0);
  if (blockType !== 0 || blockLen !== 34) return 'BAD_STREAMINFO';
  // total_samples = low nibble of byte 13 at offset 8 + bytes 14..17
  // If total_samples == 0, the stream is malformed (no audio frames declared).
  const totalHigh = ((bytes[8 + 13] ?? 0) & 0x0f);
  const totalLow =
    ((bytes[8 + 14] ?? 0) * 0x1000000) +
    ((bytes[8 + 15] ?? 0) * 0x10000) +
    ((bytes[8 + 16] ?? 0) * 0x100) +
    (bytes[8 + 17] ?? 0);
  if (totalHigh === 0 && totalLow === 0) return 'BAD_STREAMINFO';
  return 'UNKNOWN_PARSE_FAILURE';
}

export function classifyDecodeFailure(
  format: RejectFormat,
  bytes: Uint8Array,
  _errorMessage?: string,
): RejectResult {
  let reason: RejectReason = 'UNKNOWN_PARSE_FAILURE';
  if (format === 'wav') reason = classifyWav(bytes);
  else if (format === 'mp3') reason = classifyMp3(bytes);
  else if (format === 'flac') reason = classifyFlac(bytes);

  const messages: Record<RejectReason, string> = {
    TRUNCATED_HEADER: `${format} header is truncated or missing required chunks`,
    INVALID_FRAME_SYNC: `${format} contains no valid MPEG frame sync`,
    BAD_STREAMINFO: `${format} STREAMINFO block is malformed or declares zero samples`,
    UNKNOWN_PARSE_FAILURE: `${format} could not be parsed`,
  };

  return {
    ok: false,
    error: 'INVALID_ARGUMENT',
    message: messages[reason],
    reason,
    retryable: false,
  };
}