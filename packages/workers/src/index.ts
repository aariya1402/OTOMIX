// Placeholder export
export const workers = { name: '@otomix/workers' };

export { createTenantPoolRegistry } from './pool';
export type { WorkerPoolConfig, TenantPool, TenantPoolRegistry } from './pool';
export { DEFAULT_POOL_SIZE_PER_TENANT, DEFAULT_SATURATION_THRESHOLD, WORKER_POOL_CONSTANTS } from './constants';
export { createAnalysisMemory, isMemoryWithinLimit, WasmConfigError, WASM_PAGE_BYTES, MAX_WASM_PAGES } from './wasm-memory';
