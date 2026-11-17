/**
 * P04-T02-S02-M03
 * Widens chopGrid from 1/32 to 1/8 under high-load OR P03 starvation signals.
 *
 * Reuses the P03 runtime observer starvation flag (observer/degrade.ts sets
 * starvation=true when frameTimeMs > STARVATION_FRAME_MS from constants/timing.ts).
 *
 * Rule 23: Zero allocation, pure functions.
 * Rule 26: Pure logic, no seconds.
 */

import { ChopGridDenominator } from './slice.js';
import { widenChopGridIfNeeded } from './widen-grid.js';

/**
 * Sheds the chop grid when the P03 observer reports starvation,
 * or when the CPU load crosses the shedding threshold.
 *
 * @param requestedGrid - user/system requested grid (8, 16, or 32)
 * @param starvation    - P03 observer starvation flag (observer/degrade.ts)
 * @param cpuLoad       - current CPU load fraction (0.0 to 1.0)
 * @param loadThreshold - load threshold above which we widen (e.g. 0.85)
 * @returns the effective chop grid; 8 when shedding, otherwise requestedGrid
 */
export function shedChopGrid(
  requestedGrid: ChopGridDenominator,
  starvation: boolean,
  cpuLoad: number,
  loadThreshold: number
): ChopGridDenominator {
  if (starvation) {
    return 8;
  }
  return widenChopGridIfNeeded(requestedGrid, cpuLoad, loadThreshold);
}