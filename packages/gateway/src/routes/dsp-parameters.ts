// P06-T07-S01-M01
// PATCH /api/v1/dsp/parameters — validate then persist.
//
// Auth (interceptor + RBAC) is applied by the dispatcher; this handler
// only validates and stores. Idempotency-Key is enforced by the
// idempotency middleware (see idempotency/validate.ts).

import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  isChopGrid,
  isValidCrossfadeBeats,
  DspParameters,
} from '../config/dsp-params.ts';
import type { DspParametersStore } from '../store/dsp-parameters-store.ts';

export interface DspParametersHandlerDeps {
  store: DspParametersStore;
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
      try {
        body = await readBody(req);
      } catch {
        sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: 'invalid JSON body' });
        return;
      }
      if (body === null || typeof body !== 'object') {
        sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: 'body must be an object' });
        return;
      }
      if (!isChopGrid(body.chopGrid)) {
        sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: 'chopGrid must be one of 1/8, 1/16, 1/32' });
        return;
      }
      if (!isValidCrossfadeBeats(body.chopGrid, body.crossfadeBeats)) {
        sendJson(res, 400, {
          error: 'INVALID_ARGUMENT',
          message: 'crossfadeBeats must be a positive number within the chopGrid bound',
        });
        return;
      }
      const params: DspParameters = {
        chopGrid: body.chopGrid,
        crossfadeBeats: body.crossfadeBeats,
      };
      await deps.store.set(params);
      sendJson(res, 200, { ok: true, params });
    } catch (err) {
      next(err as Error);
    }
  };
}