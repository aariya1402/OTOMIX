// OTOMIX 9.1; 7.12 - GAP-017; GAP-024
import { describe, it, expect } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createRateLimitMiddleware,
  RATE_LIMIT_DEFAULTS,
} from '../src/ingest/ratelimit';
import type { RateLimitClock } from '../src/ingest/ratelimit';

function makeClock(): { clock: RateLimitClock; advance: (s: number) => void } {
  let t = 0;
  return {
    clock: { now: () => t },
    advance: (s: number) => {
      t += s;
    },
  };
}

function fakeReq(sub: string): IncomingMessage {
  return { headers: {}, claims: { sub } } as unknown as IncomingMessage;
}

function fakeRes(): {
  res: ServerResponse;
  getStatus: () => number;
  getHeader: (h: string) => string | undefined;
  getBody: () => string;
} {
  let status = 200;
  const headers: Record<string, string> = {};
  let body = '';
  const res = {
    set statusCode(v: number) {
      status = v;
    },
    get statusCode() {
      return status;
    },
    setHeader: (k: string, v: string) => {
      headers[k.toLowerCase()] = v;
    },
    end: (chunk?: string) => {
      if (typeof chunk === 'string') body = chunk;
    },
  } as unknown as ServerResponse;
  return {
    res,
    getStatus: () => status,
    getHeader: (h: string) => headers[h.toLowerCase()],
    getBody: () => body,
  };
}

describe('createRateLimitMiddleware (P07-T03-S02-M04)', () => {
  it('burst of 2x capacity -> first capacity pass, remaining get 429 with Retry-After', () => {
    const { clock } = makeClock();
    const mw = createRateLimitMiddleware({
      capacity: RATE_LIMIT_DEFAULTS.capacity,
      drainPerSec: RATE_LIMIT_DEFAULTS.drainPerSec,
      clock,
    });

    const capacity = RATE_LIMIT_DEFAULTS.capacity;
    let passed = 0;
    let limited = 0;
    let lastRetryAfter: string | undefined;

    for (let i = 0; i < capacity * 2; i++) {
      const { res, getStatus, getHeader } = fakeRes();
      let nextCalled = false;
      mw(fakeReq('user-A'), res, () => {
        nextCalled = true;
      });
      if (nextCalled) passed++;
      else {
        limited++;
        expect(getStatus()).toBe(429);
        const ra = getHeader('retry-after');
        expect(ra).toBeDefined();
        lastRetryAfter = ra;
      }
    }

    expect(passed).toBe(capacity);
    expect(limited).toBe(capacity);
    expect(lastRetryAfter).toBeDefined();
    expect(Number(lastRetryAfter)).toBeGreaterThanOrEqual(1);
  });

  it('after one full drain interval, requests pass again', () => {
    const { clock, advance } = makeClock();
    const mw = createRateLimitMiddleware({
      capacity: 10,
      drainPerSec: 1,
      clock,
    });

    for (let i = 0; i < 10; i++) {
      const { res } = fakeRes();
      mw(fakeReq('user-B'), res, () => {});
    }

    {
      const { res, getStatus } = fakeRes();
      let nextCalled = false;
      mw(fakeReq('user-B'), res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(false);
      expect(getStatus()).toBe(429);
    }

    advance(10); // one full drain interval

    {
      const { res } = fakeRes();
      let nextCalled = false;
      mw(fakeReq('user-B'), res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);
    }
  });

  it('Retry-After is integer seconds and reflects deficit / drainPerSec', () => {
    const { clock } = makeClock();
    const mw = createRateLimitMiddleware({
      capacity: 2,
      drainPerSec: 1,
      clock,
    });

    // Exhaust the bucket for user-C.
    for (let i = 0; i < 2; i++) {
      const { res } = fakeRes();
      mw(fakeReq('user-C'), res, () => {});
    }

    // Deficit is exactly 1 token; drainPerSec=1 -> Retry-After=1 (integer).
    {
      const { res, getHeader, getStatus } = fakeRes();
      mw(fakeReq('user-C'), res, () => {});
      expect(getStatus()).toBe(429);
      const ra = getHeader('retry-after');
      expect(ra).toBeDefined();
      expect(Number(ra)).toBe(1);
      expect(String(ra)).toMatch(/^\d+$/);
    }
  });
});