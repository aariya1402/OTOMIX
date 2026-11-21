export interface StarterTrackNeighbor {
  readonly camelotKey: string;
  readonly bpm: number;
}

export interface StarterWarningInput {
  readonly starter: StarterTrackNeighbor;
  readonly previous: StarterTrackNeighbor | null;
  readonly next: StarterTrackNeighbor | null;
}

function harmonicDistance(a: string, b: string): number {
  if (a === b) return 0;
  const parsedA = /^([0-9]+)([AB])$/.exec(a);
  const parsedB = /^([0-9]+)([AB])$/.exec(b);
  if (!parsedA || !parsedB) return Number.POSITIVE_INFINITY;
  const numberA = Number(parsedA[1]);
  const numberB = Number(parsedB[1]);
  const modePenalty = parsedA[2] === parsedB[2] ? 0 : 1;
  const clockwise = (numberB - numberA + 12) % 12;
  const counterclockwise = (numberA - numberB + 12) % 12;
  return Math.min(clockwise, counterclockwise) + modePenalty;
}

export function shouldWarnStarterTrack(input: StarterWarningInput): boolean {
  const neighbors = [input.previous, input.next].filter(
    (neighbor): neighbor is StarterTrackNeighbor => neighbor !== null,
  );
  return neighbors.some((neighbor) => {
    if (harmonicDistance(input.starter.camelotKey, neighbor.camelotKey) !== 0) return false;
    if (neighbor.bpm <= 0 || input.starter.bpm <= 0) return false;
    const tempoDeltaPercent =
      Math.abs(input.starter.bpm - neighbor.bpm) / input.starter.bpm * 100;
    return tempoDeltaPercent < 1;
  });
}
