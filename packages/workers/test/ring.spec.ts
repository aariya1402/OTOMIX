import { describe, it, expect } from 'vitest';
import { Worker } from 'node:worker_threads';
import { SpscRing } from '../src/ring';

const PRODUCER_JS = [
  "const { workerData } = require('node:worker_threads');",
  "const { sab, capacity, total } = workerData;",
  "const HEAD = 0, TAIL = 1;",
  "const header = new Int32Array(sab, 0, 2);",
  "const data = new Int32Array(sab, 8, capacity);",
  "let pushed = 0;",
  "while (pushed < total) {",
  "  const head = Atomics.load(header, HEAD);",
  "  const tail = Atomics.load(header, TAIL);",
  "  const nextHead = (head + 1) % capacity;",
  "  if (nextHead === tail) { continue; }",
  "  data[head] = pushed;",
  "  Atomics.store(header, HEAD, nextHead);",
  "  pushed++;",
  "}",
].join('\n');

describe('SpscRing (P04-T03-S01-M02)', () => {
  it('transfers 1M events lossless, ordered, no torn reads', async () => {
    const capacity = 4096;
    const total = 1_000_000;
    const sab = new SharedArrayBuffer(SpscRing.byteLength(capacity));

    const worker = new Worker(PRODUCER_JS, {
      eval: true,
      workerData: { sab, capacity, total },
    });

    const ring = new SpscRing(sab, capacity);
    const received: number[] = [];
    let orderViolations = 0;
    let lastValue = -1;

    await new Promise<void>((resolve, reject) => {
      worker.once('error', reject);
      worker.once('exit', () => resolve());
      const poll = () => {
        let v: number | null;
        while ((v = ring.pop()) !== null) {
          if (v <= lastValue) { orderViolations++; }
          lastValue = v;
          received.push(v);
        }
        if (received.length < total) {
          setImmediate(poll);
        }
      };
      poll();
    });

    expect(received.length).toBe(total);
    expect(orderViolations).toBe(0);
    for (let i = 0; i < total; i++) {
      if (received[i] !== i) {
        throw new Error('value mismatch at index ' + i + ': got ' + received[i]);
      }
    }
  }, 60000);
});