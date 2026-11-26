import express, { type Express } from 'express';
import { mountCatalogFeaturesRoute } from './routes/catalog-features.js';
import type { MountCatalogFeaturesRouteDeps } from './routes/catalog-features.js';
import { mountMixPlanRoute } from './routes/mixplan.js';
import type { MixPlanDeps } from './routes/mixplan.js';

export const gateway = { name: '@otomix/gateway' };

export function createGatewayApp(
  deps: MountCatalogFeaturesRouteDeps & { mixplan?: MixPlanDeps }
): Express {
  const app = express();
  app.use(express.json());
  mountCatalogFeaturesRoute(app, deps);
  if (deps.mixplan && deps.interceptor) {
    mountMixPlanRoute(app, { ...deps.mixplan, interceptor: deps.interceptor });
  }
  return app;
}
export * from './status-map.js';

export { createCspMiddleware, buildCspHeader, CspConfigError } from './csp.js';
export type { CspConfig } from './csp.js';
export { CSP_DEFAULTS } from './constants.js';

export { createDspParametersHandler } from './routes/dsp-parameters.js';
export type { DspParametersHandlerDeps } from './routes/dsp-parameters.js';
export { createInMemoryDspParametersStore } from './store/dsp-parameters-store.js';
export type { DspParametersStore } from './store/dsp-parameters-store.js';
export {
  DSP_PARAMS_CONFIG,
  isChopGrid,
  isValidCrossfadeBeats,
  maxCrossfadeBeats,
} from './config/dsp-params.js';
export type { DspParameters, ChopGrid } from './config/dsp-params.js';

export { createInterceptor, matchRoutePath } from './interceptor.js';
export type {
  InterceptorDeps,
  TokenClaims,
  TokenVerifier,
  InterceptResult,
} from './interceptor.js';

export { sniffForGateway } from './ingest/sniff.js';
export type { SniffResult, SniffDeps } from './ingest/sniff.js';

export { createSizeLimitMiddleware } from './ingest/limits.js';
export type { SizeLimitDeps } from './ingest/limits.js';

export { confineForGateway } from './ingest/confine.js';
export type { ConfineResult, ConfineDeps, ConfineReason } from './ingest/confine.js';

export { rejectForGateway } from './ingest/reject.js';
export type { RejectDeps, RejectFormat, RejectReason, RejectResult } from './ingest/reject.js';

export { extractTagsForGateway } from './ingest/tags.js';
export type { TagsDeps, TagsResult } from './ingest/tags.js';

export {
  createCatalogFeaturesHandler,
  mountCatalogFeaturesRoute,
} from './routes/catalog-features.js';
export type { CatalogFeaturesDeps, MountCatalogFeaturesRouteDeps } from './routes/catalog-features.js';
export { createMixPlanHandler, mountMixPlanRoute } from './routes/mixplan.js';
export type { MixPlanDeps, MixPlanRequest, MixPlanResponse } from './routes/mixplan.js';
export { createMixPlanAdapter } from './routes/mixplan-adapter.js';
export type { MixPlanAdapterDeps, TrackRepository as MixPlanTrackRepositoryAdapter } from './routes/mixplan-adapter.js';
export { TrackRepository } from './repository/track-repository.js';
export type { TrackRow } from './repository/track-repository.js';
