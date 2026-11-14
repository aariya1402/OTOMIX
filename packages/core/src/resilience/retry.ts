// OTOMIX §2.5; §9.3 · Mother §1; Add. §3; Add. §1–§2
const MAX_RETRIES = 3;
const HARD_ITERATION_LIMIT = 100;
const DEFAULT_BASE_MS = 200;
const DEFAULT_CAP_MS = 5000;

export interface RetryOptions {
  idempotent: boolean;
  rng?: () => number;
  baseMs?: number;
  maxRetries?: number;
  capMs?: number;
  /**
   * Optional predicate. When it returns false, the retry loop bails out
   * after the first attempt (deterministic failures — e.g. malformed
   * containers classified by `classifyDecodeFailure` — must never be
   * retried). Defaults to `() => true`, preserving the pre-existing
   * idempotent-only semantics.
   */
  isRetryable?: (err: unknown) => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveMaxRetries(opts: RetryOptions): number {
  const candidate = opts.maxRetries ?? MAX_RETRIES;
  if (!Number.isFinite(candidate) || candidate < 0) return MAX_RETRIES;
  return Math.floor(candidate);
}

export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  if (!opts.idempotent) return fn();

  const rng = opts.rng ?? Math.random;
  const baseMs = opts.baseMs ?? DEFAULT_BASE_MS;
  const capMs = opts.capMs ?? DEFAULT_CAP_MS;
  const maxRetries = resolveMaxRetries(opts);
  const isRetryable = opts.isRetryable ?? (() => true);

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryable(err)) throw err;
      if (attempt >= maxRetries || attempt >= HARD_ITERATION_LIMIT) throw err;
      const exponential = baseMs * Math.pow(2, attempt);
      const capped = Math.min(exponential, capMs);
      const jittered = rng() * capped;
      await sleep(jittered);
      attempt++;
    }
  }
}