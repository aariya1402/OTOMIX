// OTOMIX §4.9 · Owner decision D4 (2026-11-12)
// The ONLY hard gate in the system.
// All other factors (mixability, compatibility, energy) are preference/ranking.
//
// Standard Camelot wheel compatibility:
// - Same key                          (8A & 8A)  → true
// - Adjacent on wheel, same mode      (8A & 9A)  → true  (wrap: 1A & 12A)
// - Same number, flip mode (rel. maj) (8A & 8B)  → true
// - Adjacent on wheel, flip mode      (8A & 9B)  → false (energy-boost, excluded)
//
// Rule 26: camelot keys are categorical, not temporal. No _S/_MS/*Seconds.
// TODO(P05-ADD-T02-S03-M02): honor cfg.camelot.strictMode override.

import { CamelotKey } from '../types/camelot';

export function isCamelotCompatible(
  a: CamelotKey | string,
  b: CamelotKey | string,
): boolean {
  const pa = CamelotKey.parse(a);
  if (!pa.ok) return false;
  const pb = CamelotKey.parse(b);
  if (!pb.ok) return false;

  const aStr = pa.value;
  const bStr = pb.value;

  if (aStr === bStr) return true;

  const aNum = parseInt(aStr, 10);
  const bNum = parseInt(bStr, 10);
  const aMode = aStr[aStr.length - 1];
  const bMode = bStr[bStr.length - 1];

  if (aNum === bNum && aMode !== bMode) return true;

  const diff = Math.abs(aNum - bNum);
  if ((diff === 1 || diff === 11) && aMode === bMode) return true;

  return false;
}