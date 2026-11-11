import { ChopGridDenominator } from './slice';

/**
 * Determines the effective chop grid based on CPU load.
 * If the load is high (>= threshold), we widen the grid (1/32 -> 1/8) to
 * prevent audio dropouts. 
 * 
 * Rule 26: Pure logic, no seconds.
 * Rule 23: Zero allocation.
 * 
 * @param requestedGrid - the user/system requested grid (8, 16, 32)
 * @param cpuLoad - current CPU load fraction (0.0 to 1.0)
 * @param loadThreshold - threshold above which we degrade (e.g. 0.85)
 * @returns the effective chopGrid
 */
export function widenChopGridIfNeeded(
  requestedGrid: ChopGridDenominator,
  cpuLoad: number,
  loadThreshold: number
): ChopGridDenominator {
  if (cpuLoad >= loadThreshold) {
    return 8; // Widen to 1/8 beat
  }
  return requestedGrid;
}