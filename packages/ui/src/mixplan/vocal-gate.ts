// OTOMIX §4.4 · Vocal Gate for MixPlan (P08-T04-S02-M01)
// Shifts a transition window to the nearest instrumental block when it coincides with V_map=1.
// Uses findNearestInstrumentalBlock from core/vocal/nearest-instrumental.
// Rule 26: beats are used, not seconds.

import { findNearestInstrumentalBlock } from '@otomix/core';

export interface TransitionWindow {
  startBeat: number;
  endBeat: number;
}

export interface VocalGateResult {
  window: TransitionWindow;
  shifted: boolean;
  shiftAmount: number;
}

/**
 * Shifts a transition window to the nearest instrumental block
 * if it overlaps with vocal regions (where V_map = 1).
 *
 * @param window - The transition window (startBeat, endBeat)
 * @param vocalMap - Binary vocal map (1 = vocal, 0 = instrumental)
 * @param blockSize - Size of the transition window in beats (default: 16 beats = 4 bars)
 * @returns The potentially shifted window and shift information
 */
export function applyVocalGate(
  window: TransitionWindow,
  vocalMap: readonly number[],
  blockSize: number = 16
): VocalGateResult {
  const { startBeat, endBeat } = window;
  const currentBeat = startBeat;

  // Check if the window overlaps with any vocal region
  let hasVocalOverlap = false;
  for (let i = startBeat; i < endBeat && i < vocalMap.length; i++) {
    if (vocalMap[i] === 1) {
      hasVocalOverlap = true;
      break;
    }
  }

  // If no vocal overlap, return original window
  if (!hasVocalOverlap) {
    return {
      window: { startBeat, endBeat },
      shifted: false,
      shiftAmount: 0,
    };
  }

  // Find the nearest instrumental block
  const shift = findNearestInstrumentalBlock(vocalMap, currentBeat, blockSize);

  const newStart = startBeat + shift;
  const newEnd = endBeat + shift;

  return {
    window: { startBeat: newStart, endBeat: newEnd },
    shifted: shift !== 0,
    shiftAmount: shift,
  };
}