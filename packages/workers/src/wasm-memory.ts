import { WASM_HEAP_MB, WASM_PAGE_BYTES, MAX_WASM_PAGES } from './constants';

export class WasmConfigError extends Error {
  readonly code = 'INVALID_WASM_CONFIG' as const;
  constructor(message: string) { super(message); this.name = 'WasmConfigError'; }
}

if ((WASM_HEAP_MB * 1024 * 1024) % WASM_PAGE_BYTES !== 0) {
  throw new WasmConfigError(
    'WASM_HEAP_MB (' + WASM_HEAP_MB + ') must be a multiple of page size (' + (WASM_PAGE_BYTES / 1024) + ' KiB)',
  );
}

if (!Number.isInteger(MAX_WASM_PAGES) || MAX_WASM_PAGES <= 0) {
  throw new WasmConfigError('MAX_WASM_PAGES must be a positive integer');
}

export { WASM_PAGE_BYTES, MAX_WASM_PAGES };

export function createAnalysisMemory(): WebAssembly.Memory {
  return new WebAssembly.Memory({
    initial: 1,
    maximum: MAX_WASM_PAGES,
    shared: false,
  });
}

export function isMemoryWithinLimit(mem: WebAssembly.Memory): boolean {
  if (!mem || !mem.buffer) return false;
  return mem.buffer.byteLength <= MAX_WASM_PAGES * WASM_PAGE_BYTES;
}