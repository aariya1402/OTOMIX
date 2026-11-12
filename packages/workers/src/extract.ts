// OTOMIX §4.1 · §4.6 — Guarantee releaseResult is invoked exactly once
// per extraction, on both success and throw paths (WASM cleanup).
//
// Design:
//   - `releaseResult` is a method on the engine (per §4.6 wording:
//     "utilizing the `releaseResult` method post-extraction").
//   - Invoked in `finally`, never in `catch`. On throw the original error
//     propagates unchanged.
//   - Zero imports: structural interface only (Rule 18, Rule 25).
//   - No feature computation, no mapping, no validation (Rule 25).
//   - No musical quantities in seconds (Rule 26).

/**
 * Engine that exposes a WASM release hook. The wrapper invokes
 * `releaseResult()` exactly once per extraction attempt.
 */
export interface Releasable {
  releaseResult(): void;
}

/**
 * Run `run(engine, input)` and guarantee `engine.releaseResult()` is
 * invoked exactly once, whether `run` returns or throws.
 *
 * @throws Whatever `run` throws, unchanged.
 */
export function extractWithGuarantee<E extends Releasable, R>(
  engine: E,
  input: unknown,
  run: (engine: E, input: unknown) => R,
): R {
  try {
    return run(engine, input);
  } finally {
    engine.releaseResult();
  }
}