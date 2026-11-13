// OTOMIX §4.1 · Owner decision D14 (2026-11-12)
//
// Pure data registry for analysis workers (Castle & Moat gates).
// This module does NOT spawn or execute workers. It only keeps track of
// their metadata. The EngineClient asks this registry for the path/endpoint.
//
// Rule 26: No time-based identifiers.

export interface WorkerMetadata {
  readonly id: string;
  readonly type: 'wasm' | 'api';
  readonly capabilities: readonly string[];
  readonly version: string;
  readonly endpoint?: string;
  readonly path?: string;
}

export class WorkerRegistry {
  private static instance: WorkerRegistry;
  private workers = new Map<string, WorkerMetadata>();

  private constructor() {}

  public static getInstance(): WorkerRegistry {
    if (!WorkerRegistry.instance) {
      WorkerRegistry.instance = new WorkerRegistry();
    }
    return WorkerRegistry.instance;
  }

  public register(meta: WorkerMetadata): boolean {
    if (this.workers.has(meta.id)) {
      return false; // No silent overwrite
    }
    this.workers.set(meta.id, meta);
    return true;
  }

  public get(id: string): WorkerMetadata | undefined {
    return this.workers.get(id);
  }

  public list(): WorkerMetadata[] {
    return Array.from(this.workers.values());
  }

  public has(id: string): boolean {
    return this.workers.has(id);
  }

  public unregister(id: string): boolean {
    return this.workers.delete(id);
  }

  /** Testing helper: clears all registered workers. */
  public clear(): void {
    this.workers.clear();
  }
}

// Export a ready-to-use singleton instance.
export const workerRegistry = WorkerRegistry.getInstance();