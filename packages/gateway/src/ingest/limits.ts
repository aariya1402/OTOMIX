// OTOMIX §5.2 · Mother §1 · GAP-014 · GAP-017
// Cloud size/duration limit middleware. Streams are counted; overflow aborts
// before the full body is read. GAP-014: cloud implementation lives here;
// the local implementation lives in packages/adapter/src/ingest/limits.ts.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { Transform } from 'node:stream';
import { randomUUID } from 'node:crypto';
import {
  checkLimits,
  mergeLimits,
  DEFAULT_LIMITS,
  createLogger,
} from '@otomix/core';
import type { LimitsConfig, Logger } from '@otomix/core';

export interface SizeLimitDeps {
  logger?: Logger;
  config?: Partial<LimitsConfig>;
  trace_id?: string;
  span_id?: string;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function buildDefaultLogger(): Logger {
  return createLogger({ service: 'gateway-ingest' });
}

function logRejection(
  deps: SizeLimitDeps,
  reason: 'SIZE' | 'DURATION',
  limit: number,
  actual: number,
): void {
  const logger = deps.logger ?? buildDefaultLogger();
  logger.log({
    level: 'warn',
    trace_id: deps.trace_id ?? randomUUID(),
    span_id: deps.span_id ?? randomUUID(),
    event: 'ingest.limit_exceeded',
    outcome: 'failure',
    durationMs: 0,
    reason,
    limit,
    actual,
  });
}

export function createSizeLimitMiddleware(deps: SizeLimitDeps = {}) {
  const config = mergeLimits(deps.config);

  return function sizeLimit(req: IncomingMessage, res: ServerResponse, next: (err?: Error) => void): void {
    // Duration declared by client header (container-declared duration parse is
    // P07-T01-S03-M01 scope). Missing header -> skip duration check; decoded
    // duration is validated in the worker later.
    const durHeader = req.headers['x-audio-duration-seconds'];
    let declaredDurationSec = 0;
    if (typeof durHeader === 'string' && durHeader.length > 0) {
      const parsed = Number(durHeader);
      if (!Number.isFinite(parsed) || parsed < 0) {
        sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: 'X-Audio-Duration-Seconds must be a non-negative number' });
        logRejection(deps, 'DURATION', config.maxDurationSec, NaN);
        return;
      }
      declaredDurationSec = parsed;
    }

    // Duration check first (cheap, header-only).
    if (declaredDurationSec > config.maxDurationSec) {
      sendJson(res, 400, {
        error: 'INVALID_ARGUMENT',
        message: `Audio duration exceeds ${DEFAULT_LIMITS.maxDurationSec / 3600} hour limit`,
      });
      logRejection(deps, 'DURATION', config.maxDurationSec, declaredDurationSec);
      req.destroy();
      return;
    }

    // Size: early reject on Content-Length.
    const cl = req.headers['content-length'];
    if (typeof cl === 'string' && cl.length > 0) {
      const parsed = Number(cl);
      if (!Number.isFinite(parsed) || parsed < 0) {
        sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: 'Content-Length must be a non-negative number' });
        req.destroy();
        return;
      }
      const r = checkLimits(parsed, 0, config);
      if (!r.ok) {
        sendJson(res, 400, {
          error: 'INVALID_ARGUMENT',
          message: `File size exceeds ${DEFAULT_LIMITS.maxBytes / (1024 * 1024)} MB limit`,
        });
        logRejection(deps, 'SIZE', r.limit, r.actual);
        req.destroy();
        return;
      }
    }

    // Byte-counting guard for chunked / unknown length.
    let bytesRead = 0;
    const counter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        bytesRead += chunk.length;
        if (bytesRead > config.maxBytes) {
          sendJson(res, 400, {
            error: 'INVALID_ARGUMENT',
            message: `File size exceeds ${DEFAULT_LIMITS.maxBytes / (1024 * 1024)} MB limit`,
          });
          logRejection(deps, 'SIZE', config.maxBytes, bytesRead);
          req.destroy();
          cb(new Error('SIZE_EXCEEDED'));
          return;
        }
        cb(null, chunk);
      },
    });
    counter.on('error', () => { /* already responded */ });
    req.on('data', (chunk: Buffer) => {
      // If the counter transform rejected, stop consuming.
      if (bytesRead > config.maxBytes) return;
      counter.write(chunk);
    });
    req.on('end', () => {
      if (bytesRead > config.maxBytes) return;
      counter.end();
      next();
    });
    req.on('error', (err) => { next(err); });
  };
}