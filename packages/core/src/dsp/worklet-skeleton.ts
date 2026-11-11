/**
 * Comprehensive configuration injected from the Admin Dashboard.
 * NO hardcoded constants in the DSP layer.
 */
export interface WorkletConfig {
  entryBeat: number;
  exitBeat: number;
  transitionLengthBeats: number;
  chopGrid: number;
  crossfadeBeats: number;
  rateMin: number;
  rateMax: number;
  swingThreshold: number;
}

/**
 * AudioWorkletProcessor Skeleton (Mock for Unit Tests).
 * In a real browser environment, this extends AudioWorkletProcessor.
 * 
 * Rule 23: Pre-allocates all state in the constructor. Zero allocation in process().
 * Rule 26: All time logic is in beats.
 */
export class OtomixWorkletProcessor {
  private config: WorkletConfig;
  private isInTransition: boolean = false;
  
  // Pre-allocated buffers (zero allocation in process loop)
  private tempBuffer: Float32Array;

  constructor(config: WorkletConfig, bufferSize: number = 128) {
    this.config = config;
    this.tempBuffer = new Float32Array(bufferSize);
  }

  /**
   * The main audio processing loop.
   * Called by the browser for every block of audio.
   * 
   * @param inputs - Array of input Float32Arrays
   * @param outputs - Array of output Float32Arrays
   * @param currentBeat - The current beat position of the playing track
   * @returns boolean (keep alive)
   */
  public process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    currentBeat: number
  ): boolean {
    const output = outputs[0][0];
    if (!output) return true;

    // 1. Determine if we are in the transition window dynamically
    const transitionStart = this.config.exitBeat - this.config.transitionLengthBeats;
    this.isInTransition = currentBeat >= transitionStart && currentBeat <= this.config.exitBeat;

    if (!this.isInTransition) {
      // 2. Passthrough mode (Zero processing, zero allocation)
      const input = inputs[0][0];
      if (input) {
        output.set(input);
      }
    } else {
      // 3. Transition mode (Placeholder for actual chopping and crossfading logic)
      // Future implementation will use this.config.chopGrid, this.config.crossfadeBeats, etc.
      // Zero allocation will be maintained.
      const input = inputs[0][0];
      if (input) {
        output.set(input);
      }
    }

    return true;
  }
}