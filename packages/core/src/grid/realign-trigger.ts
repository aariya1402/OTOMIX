// OTOMIX §3.2 · Mother §2.2
// Detects Body-to-Attack realignment trigger.
// Pure predicate: zero-RAM, no allocations, no state.
import { BODY_REALIGN_DBFS } from '../constants/grid';

/**
 * Returns true if the outgoing sub-band RMS (in dBFS) is strictly below
 * the realignment threshold (-40 dBFS). The caller MUST ensure the
 * crossfade has completed before invoking this function.
 *
 * @param rmsDbfs - Current RMS level of the outgoing sub-band in dBFS
 * @returns true if realignment should trigger, false otherwise
 */
export function shouldTriggerRealign(rmsDbfs: number): boolean {
  return rmsDbfs < BODY_REALIGN_DBFS;
}