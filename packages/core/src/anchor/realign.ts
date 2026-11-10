// OTOMIX §3.4 · Mother §2.4
// Realigns T0 forward to the earliest validated primary downbeat.
// Zero-RAM: O(N) time, O(1) space, no allocations.

export function realignT0(candidateT0: number, validatedDownbeats: readonly number[]): number {
  if (validatedDownbeats.length === 0) {
    return candidateT0;
  }

  let earliest = validatedDownbeats[0];
  for (let i = 1; i < validatedDownbeats.length; i++) {
    if (validatedDownbeats[i] < earliest) {
      earliest = validatedDownbeats[i];
    }
  }

  return candidateT0 > earliest ? candidateT0 : earliest;
}