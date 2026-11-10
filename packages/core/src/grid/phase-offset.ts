// OTOMIX §3.2 · Mother §2.2

/**
 * Computes the phase offset Δφ between the Body Grid and Attack Grid.
 *
 * Δφ = T_body_peak − T_attack_onset
 *
 * A positive Δφ means the body peak occurs AFTER the attack onset
 * (typical for kick drums where the sub-bass envelope lags the transient).
 *
 * @param T_body_peak - Time of the body energy peak in seconds
 * @param T_attack_onset - Time of the attack transient onset in seconds
 * @returns Phase offset Δφ in seconds
 */
export function phaseOffset(T_body_peak: number, T_attack_onset: number): number {
  return T_body_peak - T_attack_onset;
}