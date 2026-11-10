// OTOMIX §3.10 · Mother §2.10
declare const __beatIndexBrand: unique symbol;

export type BeatIndex = number & { readonly [__beatIndexBrand]: true };

export type BeatIndexResult =
  | { ok: true; value: BeatIndex }
  | { ok: false; error: 'INVALID_ARGUMENT'; message: string };

export const BeatIndex = {
  parse(i: number): BeatIndexResult {
    if (!Number.isSafeInteger(i) || i === 0) {
      return {
        ok: false,
        error: 'INVALID_ARGUMENT',
        message: `Invalid beat index: ${JSON.stringify(i)}. Expected a non-zero safe integer (index zero is not assigned per §3.10).`,
      };
    }
    return { ok: true, value: i as BeatIndex };
  },
} as const;
