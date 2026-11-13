// OTOMIX §4.9 · Owner decision D6 (2026-11-12)
//
// Track structure detection interface. The full detection algorithm
// (Essentia heuristic OR TensorFlow model) is deferred to a later task.
// For now this is a stub that returns an empty structure so downstream
// code (UI hotcues, memory cues) can be wired against the interface.
//
// Rule 26: sections are beat-indexed (startBeat/endBeat), NOT seconds.
// No _S/_MS/*Seconds identifiers.
//
// Usage:
//   const structure = detectStructure(audioBuffer);
//   for (const drop of structure.drop) { ... }

export interface StructureSection {
  /** Inclusive start beat (1-based, like all OTOMIX beat indices). */
  readonly startBeat: number;
  /** Exclusive end beat. */
  readonly endBeat: number;
}

export interface TrackStructure {
  readonly intro: readonly StructureSection[];
  readonly outro: readonly StructureSection[];
  readonly verse: readonly StructureSection[];
  readonly chorus: readonly StructureSection[];
  readonly drop: readonly StructureSection[];
  readonly break: readonly StructureSection[];
  readonly bridge: readonly StructureSection[];
  readonly buildup: readonly StructureSection[];
}

const EMPTY_SECTION_ARRAY: readonly StructureSection[] = Object.freeze([]);

export function detectStructure(_audioBuffer: unknown): TrackStructure {
  return {
    intro: EMPTY_SECTION_ARRAY,
    outro: EMPTY_SECTION_ARRAY,
    verse: EMPTY_SECTION_ARRAY,
    chorus: EMPTY_SECTION_ARRAY,
    drop: EMPTY_SECTION_ARRAY,
    break: EMPTY_SECTION_ARRAY,
    bridge: EMPTY_SECTION_ARRAY,
    buildup: EMPTY_SECTION_ARRAY,
  };
}