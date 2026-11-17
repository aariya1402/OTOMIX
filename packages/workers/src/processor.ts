// @rt-safe
/**
 * P04-T03-S01-M01 - AudioWorkletProcessor skeleton.
 * Pre-allocates all buffers in the constructor. Zero allocation in process().
 * All DSP tunables come from WorkletConfig (D9 - no hardcoded values).
 */

export interface WorkletConfig {
  readonly chopGrid: number;
  readonly crossfadeBeats: number;
  readonly rateMin: number;
  readonly rateMax: number;
  readonly swingThreshold: number;
  readonly entryBeat: number;
  readonly exitBeat: number;
  readonly transitionLengthBeats: number;
}

const AudioWorkletProcessorBase: any =
  typeof (globalThis as any).AudioWorkletProcessor !== 'undefined'
    ? (globalThis as any).AudioWorkletProcessor
    : class {
        readonly port: {
          postMessage: (msg: unknown) => void;
          onmessage: ((ev: unknown) => void) | null;
        } = {
          postMessage: () => {},
          onmessage: null,
        };
      };

export class OtomixProcessor extends AudioWorkletProcessorBase {
  private readonly config: WorkletConfig;
  private readonly sliceBuffer: Float32Array;
  private readonly gridState: Float32Array;
  private readonly smoothingState: Float32Array;
  private readonly outputScratch: Float32Array;

  constructor(config: WorkletConfig, bufferSize: number = 128) {
    super();
    this.config = config;
    this.sliceBuffer = new Float32Array(bufferSize);
    this.gridState = new Float32Array(32);
    this.smoothingState = new Float32Array(8);
    this.outputScratch = new Float32Array(bufferSize);
  }

  public process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters?: Record<string, Float32Array>
  ): boolean {
    const input = inputs[0] && inputs[0][0];
    const output = outputs[0] && outputs[0][0];
    if (!input || !output) {
      return true;
    }
    const n = Math.min(input.length, output.length, this.outputScratch.length);
    if (n <= 0) {
      return true;
    }
    // Reference pre-allocated state (no allocation; single-slot writes only).
    this.sliceBuffer[0] = input[0] ?? 0;
    this.gridState[0] = this.config.chopGrid;
    this.smoothingState[0] = this.outputScratch[0] ?? 0;
    // Copy through the pre-allocated scratch buffer.
    for (let i = 0; i < n; i++) {
      this.outputScratch[i] = input[i] ?? 0;
    }
    for (let i = 0; i < n; i++) {
      output[i] = this.outputScratch[i] ?? 0;
    }
    return true;
  }
}

if (typeof (globalThis as any).registerProcessor === 'function') {
  (globalThis as any).registerProcessor('otomix-processor', OtomixProcessor);
}