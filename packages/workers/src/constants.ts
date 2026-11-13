export const DEFAULT_POOL_SIZE_PER_TENANT = 4;
export const DEFAULT_SATURATION_THRESHOLD = 0.8;

export const WORKER_POOL_CONSTANTS = Object.freeze({
  DEFAULT_POOL_SIZE_PER_TENANT,
  DEFAULT_SATURATION_THRESHOLD,
});
// Source of truth: packages/access/src/constants.ts:WASM_HEAP_MB
export const WASM_HEAP_MB = 512;
export const WASM_PAGE_BYTES = 64 * 1024;
export const MAX_WASM_PAGES = (WASM_HEAP_MB * 1024 * 1024) / WASM_PAGE_BYTES;
