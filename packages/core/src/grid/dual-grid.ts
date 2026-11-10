// OTOMIX §3.10; §3.2 · Mother §2.10; §2.2

/**
 * Dual Grid (Attack + Body) activity controller.
 *
 * Per §3.10: "The Dual Grid architecture (Body/Attack) remains computationally
 * dormant during negative indices, initializing exclusively once the timeline
 * reaches Beat 1."
 *
 * Beat index 0 is not assigned (skipped per §3.10).
 * Negative indices (i ≤ -1) map to pre-kick audio.
 * Positive indices (i ≥ 1) map to kick-aligned timeline.
 */
export class DualGrid {
  /**
   * Returns true if the Dual Grid should be active for the given beat index.
   *
   * @param i - Beat index (can be negative for pre-kick, positive for post-kick)
   * @returns true if i ≥ 1 (Beat 1 and beyond), false otherwise
   */
  static activeAt(i: number): boolean {
    return i >= 1;
  }
}