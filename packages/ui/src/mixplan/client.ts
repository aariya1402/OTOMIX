import { gateTransitionWindow, type TransitionWindow } from './vocal-gate';

export interface TransitionPlanRequest {
  fromTrackId: string;
  toTrackId: string;
  fallbackRung?: number;
  transitionWindow?: TransitionWindow;
}

export interface TransitionFallback {
  readonly rung: number | string;
  readonly reason: string;
}

export interface VocalGateOptions {
  transitionWindow: TransitionWindow;
  vocalMap: readonly number[];
}

export interface TransitionPlanResult {
  ok: boolean;
  request?: TransitionPlanRequest;
  reason?: string;
  fallback?: TransitionFallback;
  notice?: string;
}

export interface AdjacentQueuePlanResult {
  readonly results: readonly TransitionPlanResult[];
  readonly pairs: readonly (readonly [string, string])[];
}

export interface ClientOptions {
  maxFallbackRungs?: number;
  submit?: (req: TransitionPlanRequest) => Promise<unknown>;
}

export function getAdjacentTrackPairs(
  queueIds: readonly string[]
): readonly (readonly [string, string])[] {
  const pairs: Array<readonly [string, string]> = [];
  for (let i = 0; i < queueIds.length - 1; i++) {
    const fromTrackId = queueIds[i];
    const toTrackId = queueIds[i + 1];
    if (
      typeof fromTrackId === 'string' &&
      typeof toTrackId === 'string' &&
      fromTrackId.trim().length > 0 &&
      toTrackId.trim().length > 0 &&
      fromTrackId !== toTrackId
    ) {
      pairs.push([fromTrackId, toTrackId]);
    }
  }
  return pairs;
}

export function createTransitionPlanClient(opts: ClientOptions = {}) {
  const configuredMaxRungs = opts.maxFallbackRungs ?? 3;
  const maxRungs =
    Number.isInteger(configuredMaxRungs) && configuredMaxRungs >= 0
      ? configuredMaxRungs
      : 0;

  const normalizeFallback = (value: unknown): TransitionFallback | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const candidate = value as { rung?: unknown; reason?: unknown };
    if (
      candidate.rung === undefined ||
      (typeof candidate.rung !== 'number' && typeof candidate.rung !== 'string') ||
      typeof candidate.reason !== 'string'
    ) {
      return undefined;
    }
    return { rung: candidate.rung, reason: candidate.reason };
  };

  const client = {
    async planForAdjacentTracks(
      fromTrackId: string,
      toTrackId: string,
      vocalGate?: VocalGateOptions
    ): Promise<TransitionPlanResult> {
      if (
        typeof fromTrackId !== 'string' ||
        typeof toTrackId !== 'string' ||
        fromTrackId.trim().length === 0 ||
        toTrackId.trim().length === 0 ||
        fromTrackId === toTrackId
      ) {
        return { ok: false, reason: 'invalid-adjacent-track-pair' };
      }

      const transitionWindow = vocalGate
        ? gateTransitionWindow(vocalGate.transitionWindow, vocalGate.vocalMap)
        : undefined;
      if (vocalGate && !transitionWindow) {
        return { ok: false, reason: 'vocal-gate-no-instrumental-window' };
      }

      try {
        for (let rung = 0; rung <= maxRungs; rung++) {
          const request: TransitionPlanRequest = {
            fromTrackId,
            toTrackId,
            fallbackRung: rung,
            ...(transitionWindow ? { transitionWindow } : {}),
          };
          if (opts.submit) {
            try {
              const response = await opts.submit(request);
              const fallback = normalizeFallback(
                (response as { fallback?: unknown } | null)?.fallback
              );
              if (fallback) {
                const isNonFatal =
                  fallback.rung !== 0 &&
                  fallback.rung !== 'RUNG_NONE';
                return {
                  ok: true,
                  request,
                  ...(isNonFatal
                    ? {
                        fallback,
                        notice: `Fallback in use: ${String(fallback.rung)}`,
                      }
                    : {}),
                };
              }
              return { ok: true, request };
            } catch {
              continue;
            }
          }
          return { ok: true, request };
        }
        return { ok: false, reason: 'all-fallback-rungs-exhausted' };
      } catch (err) {
        return {
          ok: false,
          reason: 'exception: ' + (err instanceof Error ? err.message : String(err)),
        };
      }
    },
    async planForAdjacentQueueTracks(
      queueIds: readonly string[],
      vocalGates?: readonly (VocalGateOptions | undefined)[]
    ): Promise<AdjacentQueuePlanResult> {
      const pairs = getAdjacentTrackPairs(queueIds);
      const results: TransitionPlanResult[] = [];
      for (let i = 0; i < pairs.length; i++) {
        const [fromTrackId, toTrackId] = pairs[i]!;
        results.push(
          await client.planForAdjacentTracks(
            fromTrackId,
            toTrackId,
            vocalGates?.[i]
          )
        );
      }
      return { pairs, results };
    },
    async planAdjacentQueueTracks(
      queueIds: readonly string[],
      vocalGates?: readonly (VocalGateOptions | undefined)[]
    ): Promise<AdjacentQueuePlanResult> {
      return client.planForAdjacentQueueTracks(queueIds, vocalGates);
    },
  };
  return client;
}
