// Placeholder export
export const gateway = { name: '@otomix/gateway' };
export * from './status-map';

export { createCspMiddleware, buildCspHeader, CspConfigError } from './csp';
export type { CspConfig } from './csp';
export { CSP_DEFAULTS } from './constants';

export { createDspParametersHandler } from './routes/dsp-parameters';
export type { DspParametersHandlerDeps } from './routes/dsp-parameters';
export { createInMemoryDspParametersStore } from './store/dsp-parameters-store';
export type { DspParametersStore } from './store/dsp-parameters-store';
export { DSP_PARAMS_CONFIG, isChopGrid, isValidCrossfadeBeats, maxCrossfadeBeats } from './config/dsp-params';
export type { DspParameters, ChopGrid } from './config/dsp-params';
