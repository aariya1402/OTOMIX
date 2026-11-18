export interface TransitionPlanRequest {
  fromTrackId: string;
  toTrackId: string;
  fallbackRung?: number;
}

export interface TransitionPlanResult {
  ok: boolean;
  request?: TransitionPlanRequest;
  reason?: string;
}

export interface ClientOptions {
  maxFallbackRungs?: number;
  submit?: (req: TransitionPlanRequest) => Promise<unknown>;
}

export function createTransitionPlanClient(opts: ClientOptions = {}) {
  const maxRungs = opts.maxFallbackRungs ?? 3;
  return {
    async planForAdjacentTracks(
      fromTrackId: string,
      toTrackId: string,
    ): Promise<TransitionPlanResult> {
      try {
        for (let rung = 0; rung <= maxRungs; rung++) {
          const request: TransitionPlanRequest = { fromTrackId, toTrackId, fallbackRung: rung };
          if (opts.submit) {
            try {
              await opts.submit(request);
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
  };
}