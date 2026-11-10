// OTOMIX §4.2; §9.5 · Mother §3.2; Add. §1–§2
declare const __bpmBrand: unique symbol;

export type BPM = number & { readonly [__bpmBrand]: true };

export type BPMResult =
  | { ok: true; value: BPM }
  | { ok: false; error: 'INVALID_ARGUMENT'; message: string };

export const BPM = {
  parse(n: number): BPMResult {
    if (!Number.isFinite(n) || n < 60.0 || n > 200.0) {
      return {
        ok: false,
        error: 'INVALID_ARGUMENT',
        message: `BPM must be in [60.0, 200.0], got ${n}`,
      };
    }
    return { ok: true, value: n as BPM };
  },
} as const;
