import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import {
  isChopGrid,
  isValidCrossfadeBeats,
  DspParameters,
} from '../config/dsp-params.ts';
import type { DspParametersStore } from '../store/dsp-parameters-store.ts';
import { enqueueDspPropagation } from '../dsp-propagate.ts';

export interface AuditPayload {
  actorId: string;
  tenantId: string;
  action: string;
  detail: unknown;
}

export interface DspParametersHandlerDeps {
  store: DspParametersStore;
  audit?: (payload: AuditPayload) => Promise<void>;
  pool?: Pool;
  hmacSecret?: string;
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new Error('invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export function createDspParametersHandler(deps: DspParametersHandlerDeps) {
  return async function handler(req: IncomingMessage, res: ServerResponse, next: (err?: Error) => void): Promise<void> {
    try {
      if ((req.method ?? '') !== 'PATCH') {
        sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
        return;
      }
      let body: any;
      try { body = await readBody(req); }
      catch { sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: 'invalid JSON body' }); return; }
      if (body === null || typeof body !== 'object') {
        sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: 'body must be an object' });
        return;
      }
      if (!isChopGrid(body.chopGrid)) {
        sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: 'chopGrid must be one of 1/8, 1/16, 1/32' });
        return;
      }
      if (!isValidCrossfadeBeats(body.chopGrid, body.crossfadeBeats)) {
        sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: 'crossfadeBeats must be a positive number within the chopGrid bound' });
        return;
      }
      const before = await deps.store.get();
      const params: DspParameters = { chopGrid: body.chopGrid, crossfadeBeats: body.crossfadeBeats };

      const claims = (req as any).claims as { sub?: string; tenant_id?: string } | undefined;
      const actorId = claims?.sub ?? 'unknown';
      const tenantId = claims?.tenant_id ?? 'unknown';

      if (deps.pool && deps.hmacSecret) {
        await enqueueDspPropagation(deps.pool, {
          tenantId: tenantId as 'otomix' | 'otodj',
          chopGrid: params.chopGrid,
          crossfadeBeats: params.crossfadeBeats,
          before,
          actorId,
          hmacSecret: deps.hmacSecret,
        });
      } else {
        await deps.store.set(params);
      }

      if (deps.audit) {
        try {
          await deps.audit({
            actorId, tenantId,
            action: 'dsp.parameters.update',
            detail: { before, after: params },
          });
        } catch { /* swallowed in M02 */ }
      }
      sendJson(res, 200, { ok: true, params });
    } catch (err) {
      next(err as Error);
    }
  };
}