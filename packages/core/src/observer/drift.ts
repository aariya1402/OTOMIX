// OTOMIX §3.6 · Mother §2.6

/**
 * Computes the phase drift between the real-time rendering context clock
 * and the Absolute Locked Grid position.
 *
 * @param gridTimeSeconds - Absolute Locked Grid timestamp (seconds)
 * @param contextTimeSeconds - Real-time rendering context timestamp (seconds)
 * @returns Drift in milliseconds. Positive = context ahead of grid (fast).
 *          Negative = context behind grid (slow).
 *
 * Formula: drift_ms = (contextTimeSeconds - gridTimeSeconds) * 1000
 * Unit conversion (×1000) happens exactly once at this boundary.
 */
export function computeDrift(gridTimeSeconds: number, contextTimeSeconds: number): number {
  return (contextTimeSeconds - gridTimeSeconds) * 1000;
}