/**
 * Export Encoder (Offline).
 * Rule 23: Not @rt-safe, can allocate memory.
 * Rule 26: Works on samples and sampleRate (boundary values).
 */
export type ExportFormat = 'wav' | 'mp3' | 'flac';

export class ExportEncoder {
  /**
   * Encodes a Float32Array buffer to the specified format.
   * For now, WAV is implemented natively. MP3/FLAC are stubs for P09.
   */
  public async encode(
    buffer: Float32Array,
    format: ExportFormat,
    sampleRate: number
  ): Promise<Uint8Array> {
    if (buffer.length === 0) throw new Error('Buffer is empty');
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('Invalid sampleRate');

    if (format === 'wav') {
      return this.encodeWav(buffer, sampleRate);
    } else if (format === 'mp3' || format === 'flac') {
      // Placeholder for P09
      const dummy = new Uint8Array(100);
      dummy[0] = 0xFF; // Fake sync word
      return dummy;
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
  }

  private encodeWav(buffer: Float32Array, sampleRate: number): Uint8Array {
    const numChannels = 1; // Mono for simplicity in this mock
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * bytesPerSample;
    const chunkSize = 36 + dataSize;

    const ab = new ArrayBuffer(44 + dataSize);
    const view = new DataView(ab);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, chunkSize, true);
    this.writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // BitsPerSample

    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM samples (Float to Int16)
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      let s = Math.max(-1, Math.min(1, buffer[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, s, true);
      offset += 2;
    }

    return new Uint8Array(ab);
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}