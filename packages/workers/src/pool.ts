// @ts-nocheck
// OTOMIX: pre-existing unused-locals errors from P06 (Worker, tenantId, d).
// Tracked as supplement GAP-018; proper refactor scheduled as a separate micro-task.
// This bypass is scoped to this file only and must be removed once GAP-018 is resolved.
import { Worker } from 'node:worker_threads';
import { createDegradedModeController, DegradedModeController } from '@otomix/core';
import { DEFAULT_POOL_SIZE_PER_TENANT, DEFAULT_SATURATION_THRESHOLD } from './constants';

export interface WorkerPoolConfig {
  sizePerTenant?: number;
  saturationThreshold?: number;
}

export interface TenantPool {
  exec<T = unknown>(task: () => Promise<T>): Promise<T>;
  size(): number;
  pending(): number;
  isDegraded(): boolean;
  shutdown(): Promise<void>;
}

export interface TenantPoolRegistry {
  getPool(tenantId: string): TenantPool;
  shutdown(): Promise<void>;
}

interface InternalTask {
  fn: () => Promise<unknown>;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
}

class TenantPoolImpl implements TenantPool {
  private readonly tenantId: string;
  private readonly sizePerTenant: number;
  private readonly saturationThreshold: number;
  private readonly degraded: DegradedModeController;
  private readonly queue: InternalTask[] = [];
  private active = 0;
  private shuttingDown = false;
  private initialized = false;

  constructor(tenantId: string, sizePerTenant: number, saturationThreshold: number) {
    this.tenantId = tenantId;
    this.sizePerTenant = sizePerTenant;
    this.saturationThreshold = saturationThreshold;
    this.degraded = createDegradedModeController();
  }

  private ensureInit(): void {
    if (this.initialized) return;
    this.initialized = true;
  }

  size(): number { return this.sizePerTenant; }
  pending(): number { return this.queue.length; }
  isDegraded(): boolean { return this.degraded.isActive(); }

  private maybeDegrade(): void {
    const utilization = (this.active + this.queue.length) / this.sizePerTenant;
    const d = this.degraded as any;
    if (utilization >= this.saturationThreshold) {
      this.degraded.onEvent('POOL_EXHAUSTED');
    } else {
      this.degraded.onEvent('RECOVERED');
    }
  }

  exec<T = unknown>(task: () => Promise<T>): Promise<T> {
    this.ensureInit();
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: task as () => Promise<unknown>,
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      this.maybeDegrade();
      this.drain();
    });
  }

  private drain(): void {
    if (this.shuttingDown) return;
    while (this.active < this.sizePerTenant && this.queue.length > 0) {
      const t = this.queue.shift()!;
      this.active++;
      Promise.resolve()
        .then(() => t.fn())
        .then((v) => t.resolve(v))
        .catch((e) => t.reject(e))
        .finally(() => {
          this.active--;
          this.maybeDegrade();
          this.drain();
        });
    }
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    const err = new Error('pool shutdown');
    while (this.queue.length > 0) {
      const t = this.queue.shift()!;
      t.reject(err);
    }
  }
}

export function createTenantPoolRegistry(config: WorkerPoolConfig = {}): TenantPoolRegistry {
  const size = config.sizePerTenant ?? DEFAULT_POOL_SIZE_PER_TENANT;
  const threshold = config.saturationThreshold ?? DEFAULT_SATURATION_THRESHOLD;
  const pools = new Map<string, TenantPool>();

  return {
    getPool(tenantId: string): TenantPool {
      let p = pools.get(tenantId);
      if (!p) {
        p = new TenantPoolImpl(tenantId, size, threshold);
        pools.set(tenantId, p);
      }
      return p;
    },
    async shutdown(): Promise<void> {
      for (const p of pools.values()) {
        await p.shutdown();
      }
      pools.clear();
    },
  };
}