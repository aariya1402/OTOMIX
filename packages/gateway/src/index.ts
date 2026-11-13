// Placeholder export
export const gateway = { name: '@otomix/gateway' };
export * from './status-map';

export { createCspMiddleware, buildCspHeader, CspConfigError } from './csp';
export type { CspConfig } from './csp';
export { CSP_DEFAULTS } from './constants';
