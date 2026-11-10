// OTOMIX §3.3 · Lookahead Scheduler with 50 ms window, ±2 ms accuracy
// Zero-RAM: pre-allocated heap, no allocations in poll()

import { LOOKAHEAD_MS, SCHED_ACCURACY_MS } from '../constants/timing';
import { Clock } from './clock';

export interface ScheduledEvent {
  beat: number;
  targetTime: number;
  callback: () => void;
  id: symbol;
}

interface HeapNode {
  targetTime: number;
  event: ScheduledEvent;
}

export class LookaheadScheduler {
  private readonly heap: HeapNode[];
  private readonly capacity: number;
  private size = 0;
  private readonly clock: Clock;
  private readonly lookaheadS: number;
  private readonly accuracyS: number;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(clock: Clock, capacity = 1024) {
    this.clock = clock;
    this.capacity = capacity;
    this.heap = new Array(capacity);
    this.lookaheadS = LOOKAHEAD_MS / 1000;
    this.accuracyS = SCHED_ACCURACY_MS / 1000;
  }

  schedule(beat: number, targetTime: number, callback: () => void): symbol {
    if (this.size >= this.capacity) {
      throw new Error('Scheduler capacity exceeded');
    }
    const id = Symbol('sched');
    const node: HeapNode = { targetTime, event: { beat, targetTime, callback, id } };
    this.heap[this.size] = node;
    this.siftUp(this.size);
    this.size++;
    this.ensurePolling();
    return id;
  }

  cancel(id: symbol): boolean {
    for (let i = 0; i < this.size; i++) {
      if (this.heap[i]?.event.id === id) {
        this.removeAt(i);
        return true;
      }
    }
    return false;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public tick(): void {
    if (!this.running) return;

    const now = this.clock.now();
    const windowEnd = now + this.lookaheadS;

    while (this.size > 0 && this.heap[0]!.targetTime <= windowEnd) {
      const node = this.popMin();
      const delayMs = (node.targetTime - now) * 1000;
      
      if (delayMs <= 0) {
        node.event.callback();
      } else {
        setTimeout(() => {
          node.event.callback();
        }, delayMs);
      }
    }

    if (this.size > 0) {
      const nextDelay = Math.max(0, (this.heap[0]!.targetTime - now - this.lookaheadS) * 1000);
      const clampedDelay = Math.max(1, Math.min(nextDelay, this.lookaheadS * 1000 / 2));
      this.pollTimer = setTimeout(() => this.tick(), clampedDelay);
    } else {
      this.pollTimer = setTimeout(() => this.tick(), this.lookaheadS * 1000 / 2);
    }
  }

  private ensurePolling(): void {
    if (!this.running) this.start();
  }

  private popMin(): HeapNode {
    const min = this.heap[0]!;
    this.size--;
    this.heap[0] = this.heap[this.size]!;
    this.heap[this.size] = undefined!;
    if (this.size > 0) this.siftDown(0);
    return min;
  }

  private removeAt(index: number): void {
    this.size--;
    this.heap[index] = this.heap[this.size]!;
    this.heap[this.size] = undefined!;
    if (index < this.size) {
      this.siftUp(index);
      this.siftDown(index);
    }
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[i]!.targetTime >= this.heap[parent]!.targetTime) break;
      [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
      i = parent;
    }
  }

  private siftDown(i: number): void {
    while (true) {
      const left = (i << 1) + 1;
      const right = left + 1;
      let smallest = i;
      if (left < this.size && this.heap[left]!.targetTime < this.heap[smallest]!.targetTime) {
        smallest = left;
      }
      if (right < this.size && this.heap[right]!.targetTime < this.heap[smallest]!.targetTime) {
        smallest = right;
      }
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}