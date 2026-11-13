// Placeholder export
export const adapter = { name: '@otomix/adapter' };

export { sniffForLocal } from './ingest/sniff.js';
export type { SniffResult, WarnSink } from './ingest/sniff.js';

export { checkLimitsForLocal } from './ingest/limits.js';
export type { WarnSink } from './ingest/limits.js';

export { confineForLocal } from './ingest/confine.js';
export type { LocalConfineResult, HandleLike, ConfineWarnSink } from './ingest/confine.js';
