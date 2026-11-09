// OTOMIX §4.2; §9.5; §9.6 · Mother §3.2; Add. §1–§2
declare const __camelotBrand: unique symbol;

export type CamelotKey = string & { readonly [__camelotBrand]: true };

export type CamelotKeyResult =
  | { ok: true; value: CamelotKey }
  | { ok: false; error: 'INVALID_ARGUMENT'; message: string };

const CAMELOT_RE = /^(1[0-2]|[1-9])[AB]$/;

export const CamelotKey = {
  parse(s: string): CamelotKeyResult {
    if (!CAMELOT_RE.test(s)) {
      return {
        ok: false,
        error: 'INVALID_ARGUMENT',
        message: `Invalid Camelot key: ${JSON.stringify(s)}. Expected format: 1A-9B or 10A-12B`,
      };
    }
    return { ok: true, value: s as CamelotKey };
  },
} as const;
