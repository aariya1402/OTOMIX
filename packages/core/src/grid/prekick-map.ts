// OTOMIX §3.10 · Mother §2.10

export interface PreKickSegment {
  startBeat: number;
  bpmSeed: number;
}

export function getPreKickTime(i: number, segments: ReadonlyArray<PreKickSegment>, T0: number): number {
  if (i >= 1) throw new Error(`Pre-kick map only supports negative indices, got ${i}`);
  if (i === 0) throw new Error('Beat index 0 is not assigned per §3.10');
  if (segments.length === 0) throw new Error('Pre-kick map requires at least one segment');
  
  for (let k = 1; k < segments.length; k++) {
    if (segments[k].startBeat <= segments[k - 1].startBeat) {
      throw new Error('Segments must be strictly increasing by startBeat');
    }
  }

  let lo = 0, hi = segments.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].startBeat <= i) lo = mid + 1;
    else hi = mid - 1;
  }
  const segIdx = hi;
  const seg = segments[segIdx];

  let time = T0;
  for (let s = segments.length - 1; s >= 0; s--) {
    const cur = segments[s];
    const nextStartBeat = (s + 1 < segments.length) ? segments[s + 1].startBeat : 0;
    const segEndBeat = nextStartBeat - 1;
    const beatCount = segEndBeat - cur.startBeat + 1;
    const period = 60 / cur.bpmSeed;
    const segStartTime = time - beatCount * period;

    if (s === segIdx) {
      const offsetBeats = i - cur.startBeat;
      return segStartTime + offsetBeats * period;
    }

    time = segStartTime;
  }

  throw new Error('Internal error: segment not found during backward walk');
}