// @rt-safe
/**
 * P04-T03-S01-M02 - Lock-free SPSC ring buffer over SharedArrayBuffer.
 * Producer: single writer thread. Consumer: audio thread.
 * No Atomics.wait anywhere on the consumer side.
 *
 * Layout (Int32 slots, 4 bytes each):
 *   [0] head (next write index)
 *   [1] tail (next read index)
 *   [2 .. 2+capacity-1] data
 */

const HEAD = 0;
const TAIL = 1;
const HEADER_SLOTS = 2;

export class SpscRing {
  private readonly header: Int32Array;
  private readonly data: Int32Array;
  private readonly capacity: number;

  constructor(sab: SharedArrayBuffer, capacity: number) {
    if (capacity < 1) {
      throw new Error('SpscRing: capacity must be >= 1');
    }
    this.capacity = capacity;
    this.header = new Int32Array(sab, 0, HEADER_SLOTS);
    this.data = new Int32Array(sab, HEADER_SLOTS * 4, capacity);
  }

  static byteLength(capacity: number): number {
    return (HEADER_SLOTS + capacity) * 4;
  }

  /** Producer-side. Non-blocking. Returns false if full. */
  public push(value: number): boolean {
    const head = Atomics.load(this.header, HEAD);
    const tail = Atomics.load(this.header, TAIL);
    const nextHead = (head + 1) % this.capacity;
    if (nextHead === tail) {
      return false;
    }
    this.data[head] = value;
    Atomics.store(this.header, HEAD, nextHead);
    return true;
  }

  /** Consumer-side. Non-blocking. No Atomics.wait. Returns null if empty. */
  public pop(): number | null {
    const head = Atomics.load(this.header, HEAD);
    const tail = Atomics.load(this.header, TAIL);
    if (head === tail) {
      return null;
    }
    const value = this.data[tail] ?? 0;
    Atomics.store(this.header, TAIL, (tail + 1) % this.capacity);
    return value;
  }
}
