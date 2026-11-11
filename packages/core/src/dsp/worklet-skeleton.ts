// @rt-safe
import { AdminTuningConfig } from '../config/transition-config';

/**
 * AudioWorkletProcessor Skeleton (Mock for Unit Tests).
 * 
 * CRITICAL: It only accepts AdminTuningConfig for DSP internals. 
 * The transition length (user config) is passed per-track/per-transition,
 * but the DSP slicing logic (chopGrid, crossfade) is strictly admin-tuned.
 * 
 * Rule 23: Pre-allocates all state in the constructor. Zero allocation in process().
 * Rule 26: All time logic is in beats.
 */
export class OtomixWorkletProcessor {
  private adminConfig: AdminTuningConfig;
  private isInTransition: boolean = false;
  private tempBuffer: Float32Array;

  constructor(adminConfig: AdminTuningConfig, bufferSize: number = 128) {
    this.adminConfig = adminConfig;
    this.tempBuffer = new Float32Array(bufferSize);
  }

  /**
   * Processes audio. Note that the actual transition length (user config)
   * is passed dynamically via `currentBeat` and `transitionEndBeat`.
   */
  public process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    currentBeat: number,
    transitionEndBeat: number
  ): boolean {
    const output = outputs[0][0];
    if (!output) return true;

    // The transition length is determined by the user config (e.g., 16 bars)
    const transitionStartBeat = transitionEndBeat - (this.adminConfig.chopGrid * 0.25); // Placeholder logic
    this.isInTransition = currentBeat >= transitionStartBeat && currentBeat <= transitionEndBeat;

    if (!this.isInTransition) {
      const input = inputs[0][0];
      if (input) { output.set(input); }
    } else {
      // Transition logic here, using this.adminConfig.crossfadeBeats and this.adminConfig.chopGrid
      const input = inputs[0][0];
      if (input) { output.set(input); }
    }

    return true;
  }
}