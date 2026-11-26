import type { Express, NextFunction, Request, Response } from 'express';
import type { IdempotencyStore } from '../idempotency/store.js';
import { validateIdempotencyKey } from '../idempotency/validate.js';

export interface MixPlanRequest {
  tenant_id: string;
  outgoing_track_id: string;
  incoming_track_id: string;
  bpm_out: number;
  bpm_in: number;
  bpm_target: number;
  window_beats: number;
  crossfade_ms: number;
  chop_grid: 1 | 2 | 3;
  idempotency_key: string;
}

export interface MixPlanResponse {
  anchors: Array<{
    beat_index: number;
    t0_seconds: number;
    drift_seconds: number;
  }>;
  fallback?: {
    rung: number;
    reason: string;
  };
}

export class MixPlanTrackNotFoundError extends Error {
  constructor() {
    super('Track or track feature not found');
    this.name = 'MixPlanTrackNotFoundError';
  }
}

export interface MixPlanDeps {
  idempotencyStore?: IdempotencyStore;
  planTransition?: (request: MixPlanRequest) => Promise<MixPlanResponse>;
  interceptor?: (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
}

function isMixPlanRequest(value: unknown): value is MixPlanRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  const requiredKeys = [
    'tenant_id',
    'outgoing_track_id',
    'incoming_track_id',
    'bpm_out',
    'bpm_in',
    'bpm_target',
    'window_beats',
    'crossfade_ms',
    'chop_grid',
    'idempotency_key',
  ];
  if (
    Object.keys(body).length !== requiredKeys.length ||
    requiredKeys.some((key) => !Object.prototype.hasOwnProperty.call(body, key))
  ) {
    return false;
  }
  const stringFields = [
    body.tenant_id,
    body.outgoing_track_id,
    body.incoming_track_id,
    body.idempotency_key,
  ];
  const validFields =
    stringFields.every((field) => typeof field === 'string' && field.length > 0) &&
    [body.bpm_out, body.bpm_in, body.bpm_target].every(
      (field) => typeof field === 'number' && Number.isFinite(field) && field >= 60 && field <= 200
    ) &&
    typeof body.window_beats === 'number' &&
    Number.isInteger(body.window_beats) &&
    body.window_beats > 0 &&
    typeof body.crossfade_ms === 'number' &&
    Number.isFinite(body.crossfade_ms) &&
    body.crossfade_ms > 0 &&
    typeof body.chop_grid === 'number' &&
    Number.isInteger(body.chop_grid) &&
    body.chop_grid >= 1 &&
    body.chop_grid <= 3;
  if (
    !validFields ||
    typeof body.chop_grid !== 'number' ||
    typeof body.bpm_target !== 'number' ||
    typeof body.crossfade_ms !== 'number'
  ) {
    return false;
  }

  const chopGridFraction = 1 / 2 ** (body.chop_grid + 2);
  const maxCrossfadeMs = (60 / body.bpm_target) * chopGridFraction * 1000 / 4;
  return body.crossfade_ms <= maxCrossfadeMs;
}

function fingerprintOf(request: MixPlanRequest): string {
  return JSON.stringify([
    request.tenant_id,
    request.outgoing_track_id,
    request.incoming_track_id,
    request.bpm_out,
    request.bpm_in,
    request.bpm_target,
    request.window_beats,
    request.crossfade_ms,
    request.chop_grid,
  ]);
}

function validResponse(value: unknown): value is MixPlanResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const response = value as MixPlanResponse;
  return (
    Array.isArray(response.anchors) &&
    response.anchors.every(
      (anchor) =>
        Number.isInteger(anchor.beat_index) &&
        Number.isFinite(anchor.t0_seconds) &&
        Number.isFinite(anchor.drift_seconds)
    ) &&
    (response.fallback === undefined ||
      (Number.isInteger(response.fallback.rung) && typeof response.fallback.reason === 'string'))
  );
}

export function createMixPlanHandler(deps: MixPlanDeps) {
  return async (req: Request, res: Response): Promise<void> => {
    let keyPassed = false;
    validateIdempotencyKey(req, res, () => {
      keyPassed = true;
    });
    if (!keyPassed) return;

    if (!isMixPlanRequest(req.body)) {
      res.status(400).json({ error: 'INVALID_ARGUMENT', message: 'Invalid mixplan request' });
      return;
    }

    const headerKey = req.headers['idempotency-key'];
    if (headerKey !== req.body.idempotency_key) {
      res.status(400).json({
        error: 'INVALID_ARGUMENT',
        message: 'Idempotency-Key header must match idempotency_key',
      });
      return;
    }
    const claims = (req as Request & { claims?: { tenant_id?: string } }).claims;
    if (!claims?.tenant_id || req.body.tenant_id !== claims.tenant_id) {
      res.status(403).json({ error: 'PERMISSION_DENIED', message: 'Tenant mismatch' });
      return;
    }
    if (!deps.idempotencyStore || !deps.planTransition) {
      res.status(503).json({ error: 'UNAVAILABLE', message: 'MixPlan backend is not configured' });
      return;
    }

    try {
      const result = await deps.idempotencyStore.withIdempotency<MixPlanResponse>(
        req.body.tenant_id,
        headerKey,
        fingerprintOf(req.body),
        async () => {
          const response = await deps.planTransition!(req.body);
          if (!validResponse(response)) throw new Error('Invalid PlanTransition response');
          return response;
        }
      );
      if (result.status === 'conflict' || result.response === undefined) {
        res.status(409).json({ error: 'ABORTED', message: 'Idempotency conflict' });
        return;
      }
      res.status(200).json(result.response);
    } catch (error) {
      if (error instanceof MixPlanTrackNotFoundError) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Track or track feature not found' });
        return;
      }
      res.status(503).json({ error: 'UNAVAILABLE', message: 'MixPlan backend unavailable' });
    }
  };
}

export function mountMixPlanRoute(app: Express, deps: MixPlanDeps): Express {
  if (!deps.interceptor) return app;
  app.post(
    '/api/v1/mixplan',
    async (req: Request, res: Response, next: NextFunction) => {
      await deps.interceptor!(req, res, next);
    },
    createMixPlanHandler(deps)
  );
  return app;
}
