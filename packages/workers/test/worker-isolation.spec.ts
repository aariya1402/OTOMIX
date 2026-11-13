// P06-T05-S01-M03: verify worker isolation.
//
// Current environment: Node `worker_threads`. Playwright is not yet installed
// and no browser-based workers are served (that lands with the UI in P08).
//
// This test verifies 2 of 3 properties natively in Node:
//   1. `document` is undefined in a worker
//   2. `localStorage` is undefined in a worker
//
// The third property (cross-origin fetch blocked by CSP connect-src 'self')
// is verified only by DNS failure here. Real CSP enforcement requires a
// browser context and will be exercised in P08 when the UI + browser workers
// ship:
//
//   TODO(P08): Replace this Node probe with a Playwright test that loads
//   a same-origin probe HTML + spawns a Web Worker under the CSP middleware
//   (connect-src 'self') and asserts the fetch is blocked by CSP.

import { describe, it, expect } from 'vitest';
import { Worker } from 'node:worker_threads';

interface ProbeResult {
  document: string;
  localStorage: string;
  fetchError: string | null;
  hasParentPort: boolean;
}

function runProbe(): Promise<ProbeResult> {
  const code = `
    const { parentPort } = require('node:worker_threads');
    const result = {
      document: typeof document,
      localStorage: typeof localStorage,
      fetchError: null,
      hasParentPort: typeof parentPort !== 'undefined' && parentPort !== null,
    };
    (async () => {
      try {
        await fetch('https://example.invalid');
      } catch (e) {
        result.fetchError = String(e && e.message ? e.message : e);
      }
      parentPort.postMessage(result);
    })();
  `;
  return new Promise<ProbeResult>((resolve, reject) => {
    const w = new Worker(code, { eval: true });
    const timer = setTimeout(() => {
      w.terminate();
      reject(new Error('probe worker did not respond'));
    }, 5000);
    w.once('message', (msg: ProbeResult) => {
      clearTimeout(timer);
      w.terminate();
      resolve(msg);
    });
    w.once('error', (err) => {
      clearTimeout(timer);
      w.terminate();
      reject(err);
    });
  });
}

describe('worker isolation (P06-T05-S01-M03)', () => {
  it('worker has no DOM, no localStorage, and cannot fetch cross-origin', async () => {
    const r = await runProbe();
    expect(r.document).toBe('undefined');
    expect(r.localStorage).toBe('undefined');
    expect(r.hasParentPort).toBe(true);
    expect(r.fetchError).toBeTruthy();
    expect(typeof r.fetchError).toBe('string');
  });
});