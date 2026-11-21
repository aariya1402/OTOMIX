// OTOMIX §9.2; §9.4 · POST /api/v1/mixplan

import type { Pool } from 'pg';
import type { Request, Response, NextFunction } from 'express';
import { planTransition } from '@otomix/core/transition';
import type { TrackGridParams } from '@otomix/core/transition';
import { createLogger } from '@otomix/core';
import type { Logger, LogRecord } from '@otomix/core';
import { randomUUID } from 'node:crypto';
import { FeaturesRepository } from '../repository/features-repository.js';
import type { IdempotencyStore } from '../idempotency/store';
import type { TenantId } from '@otomix/db';

export interface MixPlanRequest {
  fromTrackId: string;
  toTrackId: string;
  fallbackRung?: number;
}

export interface MixPlanResponse {
  rung: string;
  reason: string;
  tInSeconds: number;
  tOutSeconds: number;
  inBeatIndex: number;
  outBeatIndex: number;
  alignToSeconds: number;
  mappedBpm: number;
  paddingBeats?: number;
}

export interface MixPlanDeps {
  pool: Pool;
  idempotencyStore: IdempotencyStore;
  maxFallbackRungs?: number;
  logger?: Logger;
}

export function createMixPlanHandler(
  deps: MixPlanDeps,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const logger = deps.logger ?? createLogger({ service: 'gateway-mixplan' });
  const repo = new FeaturesRepository(deps.pool);

  return async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    const body = req.body as MixPlanRequest | undefined;
    if (!body?.fromTrackId || !body?.toTrackId) {
      res.status(400).json({ error: 'INVALID_ARGUMENT', message: 'fromTrackId and toTrackId are required' });
      return;
    }

    const tenantId = (req as Request & { claims?: { tenant_id?: string } }).claims?.tenant_id;
    if (!tenantId) {
      res.status(403).json({ error: 'PERMISSION_DENIED', message: 'No tenant context' });
      return;
    }

    const idempotencyKey = req.headers['idempotency-key'];
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
      res.status(400).json({ error: 'INVALID_ARGUMENT', message: 'Idempotency-Key header is required' });
      return;
    }

    try {
      const tenant = tenantId as TenantId;
      const idempotencyResult = await deps.idempotencyStore.withIdempotency(
        idempotencyKey,
        `${tenant}:${body.fromTrackId}:${body.toTrackId}:${body.fallbackRung ?? ''}`,
        async () => {
          const [fromFeatures, toFeatures] = await Promise.all([
            repo.findByTrackId(tenant, body.fromTrackId),
            repo.findByTrackId(tenant, body.toTrackId),
          ]);

          if (!fromFeatures || !toFeatures) {
            return { statusCode: 404, body: { error: 'NOT_FOUND', message: 'One or both tracks not found' } };
          }
          if (fromFeatures.analysis_status !== 'complete' || toFeatures.analysis_status !== 'complete') {
            return { statusCode: 400, body: { error: 'INVALID_ARGUMENT', message: 'Both tracks must have complete analysis' } };
          }

          const incomingRegistry = toFeatures.registry_json as Record<string, unknown>;
          const outgoingRegistry = fromFeatures.registry_json as Record<string, unknown>;
          const incoming: TrackGridParams = {
            T0: typeof incomingRegistry.t0 === 'number' ? incomingRegistry.t0 : 0,
            bpmSeed: toFeatures.bpm,
            hasKick: typeof incomingRegistry.hasKick === 'boolean' ? incomingRegistry.hasKick : false,
            duration: typeof incomingRegistry.duration === 'number' ? incomingRegistry.duration : 0,
            preKickBeats: typeof incomingRegistry.preKickBeats === 'number' ? incomingRegistry.preKickBeats : 0,
          };
          const outgoing: TrackGridParams = {
            T0: typeof outgoingRegistry.t0 === 'number' ? outgoingRegistry.t0 : 0,
            bpmSeed: fromFeatures.bpm,
            hasKick: typeof outgoingRegistry.hasKick === 'boolean' ? outgoingRegistry.hasKick : false,
            duration: typeof outgoingRegistry.duration === 'number' ? outgoingRegistry.duration : 0,
            preKickBeats: typeof outgoingRegistry.preKickBeats === 'number' ? outgoingRegistry.preKickBeats : 0,
          };

          try {
            const plan = planTransition(incoming, outgoing);
            const response: MixPlanResponse = {
              rung: plan.rung,
              reason: plan.reason,
              tInSeconds: plan.tInSeconds,
              tOutSeconds: plan.tOutSeconds,
              inBeatIndex: plan.inBeatIndex,
              outBeatIndex: plan.outBeatIndex,
              alignToSeconds: plan.alignToSeconds,
              mappedBpm: plan.mappedBpm,
              ...(plan.paddingBeats !== undefined ? { paddingBeats: plan.paddingBeats } : {}),
            };
            return { statusCode: 200, body: response };
          } catch (err) {
            logger.log({
              level: 'error',
              event: 'mixplan.plan_failed',
              outcome: 'failure',
              error: (err as Error).message,
              trace_id: randomUUID(),
              span_id: 'mixplan',
              durationMs: 0,
            } satisfies LogRecord);
            return { statusCode: 500, body: { error: 'INTERNAL_ERROR', message: 'Failed to generate transition plan' } };
          }
        },
      );

      if (idempotencyResult.status === 'conflict') {
        res.status(409).json({ error: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key already in use' });
        return;
      }

      const result = idempotencyResult.response as { statusCode: number; body: unknown };
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      logger.log({
        level: 'error',
        event: 'mixplan.handler_error',
        outcome: 'failure',
        error: (err as Error).message,
        trace_id: randomUUID(),
        span_id: 'mixplan',
        durationMs: 0,
      } satisfies LogRecord);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  };
}
