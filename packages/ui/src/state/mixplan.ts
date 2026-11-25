// OTOMIX §4.9 · Starter Track & Force Insert (P05-ADD-T04-S01-M01)
//
// Redux-shaped state for the Starter Track workflow. The state carries the
// compatibility score so the UI can rank candidates and distinguish a system
// error (hard Camelot gate failure) from a user fault (force-insertion of an
// inadvisable track).
//
// Rule 25: Energy and Mixability are preferences; only Camelot is a hard gate.
//          Force Insert is always allowed, but the resulting state carries
//          fault='USER' so the UI can attribute the mix quality correctly.
// Rule 26: Dimensionless scores only. No time units.

export type MixplanFault = 'SYSTEM' | 'USER' | null;

export interface MixplanState {
  readonly starter: string | null;
  readonly compatibility_score: number;
  readonly forced: boolean;
  readonly forceInsertedTracks: readonly string[];
  readonly fault: MixplanFault;
  readonly warnings: readonly string[];
}

export interface StarterCandidate {
  readonly trackId: string;
  readonly compatibilityScore: number;
  readonly camelotValid: boolean;
}

const SYSTEM_HARD_GATE_WARNING = 'SYSTEM_HARD_GATE: candidate fails the Camelot hard gate';
const USER_FORCE_INSERT_WARNING =
  'USER_FORCE_INSERT: user forced a sub-threshold track into the plan';

export function emptyMixplanState(): MixplanState {
  return {
    starter: null,
    compatibility_score: 0,
    forced: false,
    forceInsertedTracks: [],
    fault: null,
    warnings: [],
  };
}

export function selectStarter(candidate: StarterCandidate): MixplanState {
  // A hard-gate violation is a system error: the UI must never auto-select
  // such a track, and fault attribution is SYSTEM.
  if (!candidate.camelotValid) {
    return {
      starter: candidate.trackId,
      compatibility_score: candidate.compatibilityScore,
      forced: false,
      forceInsertedTracks: [],
      fault: 'SYSTEM',
      warnings: [SYSTEM_HARD_GATE_WARNING],
    };
  }
  return {
    starter: candidate.trackId,
    compatibility_score: candidate.compatibilityScore,
    forced: false,
    forceInsertedTracks: [],
    fault: null,
    warnings: [],
  };
}

export function forceInsert(
  candidate: StarterCandidate,
  current: MixplanState,
  options?: { minCompatibility?: number }
): MixplanState {
  const minCompatibility = options?.minCompatibility ?? 0;
  const belowThreshold = candidate.compatibilityScore < minCompatibility;
  const warnings = current.warnings.slice();
  if (belowThreshold) {
    warnings.push(USER_FORCE_INSERT_WARNING);
  }
  const fault: MixplanFault = belowThreshold ? 'USER' : current.fault;
  return {
    starter: current.starter ?? candidate.trackId,
    compatibility_score: candidate.compatibilityScore,
    forced: true,
    forceInsertedTracks: [...current.forceInsertedTracks, candidate.trackId],
    fault,
    warnings,
  };
}
