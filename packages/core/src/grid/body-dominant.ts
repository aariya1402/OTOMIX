// P03-T02-S01-M02 (body-dominant traceability)
// OTOMIX 3.2 - Mother 2.2
// Compare Attack power vs Body power.
// If body > attack, tag BODY_DOMINANT.

export interface BodyDominanceResult {
  bodyDominant: boolean;
  attackPower: number;
  bodyPower: number;
}

function rms(arr: Float32Array): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i]! * arr[i]!;
  }
  return Math.sqrt(sum / arr.length);
}

export function classifyBodyDominance(
  attackEnvelope: Float32Array,
  bodyEnvelope: Float32Array,
): BodyDominanceResult {
  const attackPower = rms(attackEnvelope);
  const bodyPower = rms(bodyEnvelope);
  return {
    bodyDominant: bodyPower > attackPower,
    attackPower,
    bodyPower,
  };
}