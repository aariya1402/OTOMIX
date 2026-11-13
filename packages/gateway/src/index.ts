// Placeholder export
export const gateway = { name: '@otomix/gateway' };
export * from './status-map.js';

export { createCspMiddleware, buildCspHeader, CspConfigError } from './csp.js';
export type { CspConfig } from './csp.js';
export { CSP_DEFAULTS } from './constants.js';

export { createDspParametersHandler } from './routes/dsp-parameters.js';
export type { DspParametersHandlerDeps } from './routes/dsp-parameters.js';
export { createInMemoryDspParametersStore } from './store/dsp-parameters-store.js';
export type { DspParametersStore } from './store/dsp-parameters-store.js';
export { DSP_PARAMS_CONFIG, isChopGrid, isValidCrossfadeBeats, maxCrossfadeBeats } from './config/dsp-params.js';
export type { DspParameters, ChopGrid } from './config/dsp-params.js';

export { createInterceptor, matchRoutePath } from './interceptor.js';
export type { InterceptorDeps, TokenClaims, TokenVerifier, InterceptResult } from './interceptor.js';

export { sniffForGateway } from './ingest/sniff.js';
export type { SniffResult, SniffDeps } from './ingest/sniff.js';
