import type { IncomingMessage, ServerResponse } from 'node:http';
import { CSP_DEFAULTS } from './constants.ts';

export interface CspConfig {
  scriptSrc?: string[];
  workerSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  defaultSrc?: string[];
}

export class CspConfigError extends Error {
  readonly code = 'INVALID_CSP_CONFIG' as const;
  constructor(message: string) { super(message); this.name = 'CspConfigError'; }
}

const FORBIDDEN_SOURCES = ['*', "'unsafe-inline'"];

function validateSources(sources: string[], directive: string): void {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new CspConfigError(directive + ' must be a non-empty array');
  }
  for (const s of sources) {
    if (FORBIDDEN_SOURCES.indexOf(s) >= 0) {
      throw new CspConfigError(directive + ' must not contain ' + s);
    }
  }
  if (sources.indexOf("'self'") < 0) {
    throw new CspConfigError(directive + " must include 'self'");
  }
}

export function buildCspHeader(config: CspConfig = {}): string {
  const scriptSrc = config.scriptSrc ?? (CSP_DEFAULTS.scriptSrc as unknown as string[]).slice();
  const workerSrc = config.workerSrc ?? (CSP_DEFAULTS.workerSrc as unknown as string[]).slice();
  validateSources(scriptSrc, 'script-src');
  validateSources(workerSrc, 'worker-src');

  const styleSrc = config.styleSrc ?? (CSP_DEFAULTS.styleSrc as unknown as string[]).slice();
  const imgSrc = config.imgSrc ?? (CSP_DEFAULTS.imgSrc as unknown as string[]).slice();
  const connectSrc = config.connectSrc ?? (CSP_DEFAULTS.connectSrc as unknown as string[]).slice();
  const fontSrc = config.fontSrc ?? (CSP_DEFAULTS.fontSrc as unknown as string[]).slice();
  const defaultSrc = config.defaultSrc ?? (CSP_DEFAULTS.defaultSrc as unknown as string[]).slice();

  const parts: string[] = [];
  parts.push('default-src ' + defaultSrc.join(' '));
  parts.push('script-src ' + scriptSrc.join(' '));
  parts.push('worker-src ' + workerSrc.join(' '));
  parts.push('style-src ' + styleSrc.join(' '));
  parts.push('img-src ' + imgSrc.join(' '));
  parts.push('connect-src ' + connectSrc.join(' '));
  parts.push('font-src ' + fontSrc.join(' '));
  parts.push("object-src 'none'");
  parts.push("base-uri 'none'");
  parts.push("frame-ancestors 'none'");
  return parts.join('; ');
}

export function createCspMiddleware(config: CspConfig = {}) {
  const header = buildCspHeader(config);
  return function cspMiddleware(_req: IncomingMessage, res: ServerResponse, next: (err?: Error) => void): void {
    res.setHeader('Content-Security-Policy', header);
    next();
  };
}