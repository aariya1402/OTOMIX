export interface TransitionPlanRequest {
  fromTrackId: string;
  toTrackId: string;
  fallbackRung?: number;
}

export interface TransitionPlanResponse {
  rung: string;
  reason: string;
  tInSeconds: number;
  tOutSeconds: number;
  inBeatIndex: number;
  outBeatIndex: number;
  alignToSeconds: number;
  mappedBpm: number;
  windowBeats: number;
  paddingBeats?: number;
}

export interface TransitionPlanResult {
  ok: boolean;
  request?: TransitionPlanRequest;
  response?: TransitionPlanResponse;
  reason?: string;
  fallback?: boolean;
  notice?: string;
}

export interface ClientOptions {
  maxFallbackRungs?: number;
  submit?: (req: TransitionPlanRequest) => Promise<TransitionPlanResponse>;
  onFallback?: (rung: string, notice: string) => void;
}

export function createTransitionPlanClient(opts: ClientOptions = {}) {
  const maxRungs = opts.maxFallbackRungs ?? 3;
  return {
    async planForAdjacentTracks(
      fromTrackId: string,
      toTrackId: string,
    ): Promise<TransitionPlanResult> {
      try {
        let lastFallbackResponse: TransitionPlanResponse | null = null;
        for (let rung = 0; rung <= maxRungs; rung++) {
          const request: TransitionPlanRequest = { fromTrackId, toTrackId, fallbackRung: rung };
          if (opts.submit) {
            try {
              const response = await opts.submit(request);
              if (response.rung === 'RUNG_FOUR_BAR_CROSSFADE') {
                const notice = `Fallback rung ${response.rung} used: ${response.reason}`;
                if (opts.onFallback) {
                  opts.onFallback(response.rung, notice);
                }
                lastFallbackResponse = response;
                // If this is the last rung and onFallback is provided, return fallback as success
                if (rung === maxRungs && opts.onFallback) {
                  return {
                    ok: true,
                    request,
                    response,
                    fallback: true,
                    notice: `Fallback rung ${response.rung} used: ${response.reason}`,
                  };
                }
                // Continue to next rung
                continue;
              }
              return { ok: true, request, response };
            } catch (err) {
              // Submit threw an exception - return error
              return {
                ok: false,
                reason: 'exception: ' + (err instanceof Error ? err.message : String(err)),
              };
            }
          } else {
            // No submit function provided - return request directly
            return { ok: true, request };
          }
        }
        // All rungs exhausted with fallback
        if (lastFallbackResponse) {
          // If onFallback callback provided, treat as success with fallback
          if (opts.onFallback) {
            return {
              ok: true,
              request: { fromTrackId, toTrackId, fallbackRung: maxRungs },
              response: lastFallbackResponse,
              fallback: true,
              notice: `All fallback rungs exhausted. Last: ${lastFallbackResponse.rung} used: ${lastFallbackResponse.reason}`,
            };
          }
          return {
            ok: false,
            reason: 'all-fallback-rungs-exhausted',
            response: lastFallbackResponse,
            fallback: true,
            notice: `All fallback rungs exhausted. Last: ${lastFallbackResponse.rung} used: ${lastFallbackResponse.reason}`,
          };
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