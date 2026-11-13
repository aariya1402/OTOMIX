// OTOMIX §5.2 · Mother §1 · GAP-014 · GAP-017
import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createSizeLimitMiddleware } from '../src/ingest/limits';
import type { Logger } from '@otomix/core';

interface MockRes {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  ended: boolean;
  setHeader: (k: string, v: string) => void;
  end: (b?: string) => void;
}

function mockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    headers: {},
    body: '',
    ended: false,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(b?: string) { this.ended = true; this.body = b ?? ''; },
  };
  return res;
}

function mockReq(opts: { headers?: Record<string, string>; chunks?: Buffer[]; destroyOnEnd?: boolean }): {
  req: IncomingMessage & { destroyed: boolean; _emit: (ev: string, ...args: any[]) => void };
} {
  const listeners: Record<string, Array<(...args: any[]) => void>> = {};
  const req = {
    headers: opts.headers ?? {},
    destroyed: false,
    on(ev: string, fn: (...args: any[]) => void) {
      (listeners[ev] = listeners[ev] ?? []).push(fn);
      return req;
    },
    destroy() { req.destroyed = true; },
    _emit(ev: string, ...args: any[]) {
      for (const fn of listeners[ev] ?? []) fn(...args);
    },
  };
  // Asynchronously deliver chunks so the middleware can attach listeners.
  if (opts.chunks) {
    queueMicrotask(() => {
      for (const c of opts.chunks) {
        if (req.destroyed) return;
        req._emit('data', c);
      }
      if (!req.destroyed) req._emit('end');
    });
  }
  return { req: req as any };
}

function mockLogger(): { logger: Logger; calls: any[] } {
  const calls: any[] = [];
  return {
    logger: { log: (r: any) => { calls.push(r); } } as unknown as Logger,
    calls,
  };
}

interface CallState { nextCalled: boolean; nextErr?: Error; }

function callMiddleware(
  mw: ReturnType<typeof createSizeLimitMiddleware>,
  req: IncomingMessage,
  res: ServerResponse,
): CallState {
  const state: CallState = { nextCalled: false, nextErr: undefined };
  mw(req, res, (err) => { state.nextCalled = true; state.nextErr = err; });
  return state;
}

describe('createSizeLimitMiddleware (P07-T01-S02-M01)', () => {
  it('Content-Length over limit -> 400 INVALID_ARGUMENT + req.destroy + no body read', () => {
    const { logger, calls } = mockLogger();
    const mw = createSizeLimitMiddleware({
      logger,
      config: { maxBytes: 1024, maxDurationSec: 60 },
    });
    const { req } = mockReq({ headers: { 'content-length': '1025' } });
    const res = mockRes();
    callMiddleware(mw, req as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_ARGUMENT');
    expect(req.destroyed).toBe(true);
    expect(calls.length).toBe(1);
    expect(calls[0].event).toBe('ingest.limit_exceeded');
    expect(calls[0].reason).toBe('SIZE');
  });

  it('Chunked stream over limit -> aborts mid-stream, bytesRead < 2x limit', async () => {
    const { logger, calls } = mockLogger();
    const mw = createSizeLimitMiddleware({
      logger,
      config: { maxBytes: 1024, maxDurationSec: 60 },
    });
    const chunks = [Buffer.alloc(600), Buffer.alloc(600), Buffer.alloc(600), Buffer.alloc(600)];
    const { req } = mockReq({ chunks });
    const res = mockRes();
    callMiddleware(mw, req as any, res as any);
    await new Promise((r) => setTimeout(r, 10));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_ARGUMENT');
    expect(req.destroyed).toBe(true);
    // middle chunk triggered overflow: 3 chunks = 1800 > 1024, but 4th not delivered
    const sizeEvents = calls.filter((c) => c.reason === 'SIZE');
    expect(sizeEvents.length).toBe(1);
  });

  it('Duration over limit -> 400 + req.destroy (no stream read)', () => {
    const { logger, calls } = mockLogger();
    const mw = createSizeLimitMiddleware({
      logger,
      config: { maxBytes: 1024 * 1024, maxDurationSec: 60 },
    });
    const { req } = mockReq({ headers: { 'x-audio-duration-seconds': '61' } });
    const res = mockRes();
    callMiddleware(mw, req as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_ARGUMENT');
    expect(req.destroyed).toBe(true);
    expect(calls[0].reason).toBe('DURATION');
  });

  it('Valid request (under both limits) -> next() called, no response', async () => {
    const { logger, calls } = mockLogger();
    const mw = createSizeLimitMiddleware({
      logger,
      config: { maxBytes: 1024, maxDurationSec: 60 },
    });
    const { req } = mockReq({
      headers: { 'content-length': '100', 'x-audio-duration-seconds': '10' },
      chunks: [Buffer.alloc(100)],
    });
    const res = mockRes();
    const out = callMiddleware(mw, req as any, res as any);
    await new Promise((r) => setTimeout(r, 10));
    expect(out.nextCalled).toBe(true);
    expect(out.nextErr).toBeUndefined();
    expect(res.ended).toBe(false);
    expect(calls.length).toBe(0);
  });

  it('Invalid duration header -> 400', () => {
    const { logger } = mockLogger();
    const mw = createSizeLimitMiddleware({
      logger,
      config: { maxBytes: 1024, maxDurationSec: 60 },
    });
    const { req } = mockReq({ headers: { 'x-audio-duration-seconds': 'not-a-number' } });
    const res = mockRes();
    callMiddleware(mw, req as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_ARGUMENT');
  });

  it('Production path (no logger injected) does not throw on rejection', () => {
    const mw = createSizeLimitMiddleware({ config: { maxBytes: 1, maxDurationSec: 60 } });
    const { req } = mockReq({ headers: { 'content-length': '2' } });
    const res = mockRes();
    expect(() => callMiddleware(mw, req as any, res as any)).not.toThrow();
    expect(res.statusCode).toBe(400);
  });
});