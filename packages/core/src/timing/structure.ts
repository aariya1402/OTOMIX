// @structural
// OTOMIX §3.15 · Mother §2.3; Add. §4
// Zero-RAM structural arithmetic: all functions O(1) time & space, zero allocation.

export const BEATS_PER_BAR = 4;

/**
 * Floor modulo: returns non-negative remainder for any integer x, positive m.
 * Throws if m is not a positive integer.
 */
export function floorMod(x: number, m: number): number {
  if (!Number.isInteger(m) || m <= 0) {
    throw new RangeError('modulus must be a positive integer');
  }
  return ((x % m) + m) % m;
}

/**
 * Beat position within a 4/4 bar (1-based: 1..4).
 * beatInBar(1)=1, beatInBar(4)=4, beatInBar(5)=1, beatInBar(-1)=3.
 */
export function beatInBar(i: number): number {
  return floorMod(i - 1, BEATS_PER_BAR) + 1;
}

/**
 * Absolute bar index (0-based).
 * barIndex(1)=0, barIndex(4)=0, barIndex(5)=1, barIndex(65)=16.
 */
export function barIndex(i: number): number {
  return Math.floor((i - 1) / BEATS_PER_BAR);
}

/**
 * Beat position within an nBars-block (0-based: 0 .. 4*nBars-1).
 * nBars must be one of {4, 8, 16, 32}.
 * blockPosition(1,16)=0, blockPosition(64,16)=63, blockPosition(65,16)=0.
 */
export function blockPosition(i: number, nBars: number): number {
  if (!Number.isInteger(nBars) || nBars < 1) {
    throw new RangeError('nBars must be a positive integer');
  }
  if (nBars !== 4 && nBars !== 8 && nBars !== 16 && nBars !== 32) {
    throw new RangeError('nBars must be one of: 4, 8, 16, 32');
  }
  return floorMod(i - 1, BEATS_PER_BAR * nBars);
}

/**
 * True iff the beat falls on a block boundary (first beat of an nBars-block).
 * isBlockBoundary(1,16)=true, isBlockBoundary(65,16)=true, isBlockBoundary(64,16)=false.
 */
export function isBlockBoundary(i: number, nBars: number): boolean {
  return blockPosition(i, nBars) === 0;
}